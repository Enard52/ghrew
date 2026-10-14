import { Buffer } from "node:buffer";
import { z } from "zod";
import { executeVault, installationToken } from "../scripts/vault-service";
import { GitHub, githubFetch, actorSchema } from "./github";
import { HttpError, random } from "./security";
import { type App, Store, type Workspace } from "./store";

export const organizationSchema = z
  .string()
  .regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i)
  .transform((v) => v.toLowerCase());
const repoSchema = z.object({
  id: z.number(),
  private: z.boolean(),
  description: z.string().nullable(),
  has_discussions: z.boolean(),
});
const gqlSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.unknown()).optional(),
});
export function workspaceConfig(workspace: Workspace, app: App) {
  return {
    version: 1 as const,
    backend: true,
    repository: workspace.repository,
    vault: workspace.vault,
    clientId: app.client_id,
    appSlug: app.slug,
    publicKey: "",
    openRegistration: workspace.openRegistration,
    memberPrivateChannels: workspace.memberPrivateChannels,
  };
}
export async function provisionWorkspace(
  store: Store,
  api: GitHub,
  actor: z.infer<typeof actorSchema>,
  organization: string,
  sandbox: string,
) {
  return store.locked("provision:" + organization, async () => {
    const membership = await api.api(
      `/user/memberships/orgs/${organization}`,
      z.object({ role: z.string(), state: z.string() }),
    );
    if (membership.role !== "admin" || membership.state !== "active")
      throw new HttpError(
        403,
        "A GitHub organization owner must create this workspace.",
      );
    const org = await api.api(
      `/orgs/${organization}`,
      z.object({
        default_repository_permission: z.string().nullable().optional(),
      }),
    );
    if (org.default_repository_permission !== "none")
      throw new HttpError(
        409,
        "Set this organization's base repository permission to None in GitHub first, then retry. This keeps the private vault administrator-only. Ghrew will not change access to your other repositories.",
      );
    const installations: {
      id: number;
      app_id: number;
      account: { login: string };
    }[] = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await api.api(
        `/user/installations?per_page=100&page=${page}`,
        z.object({
          total_count: z.number(),
          installations: z.array(
            z.object({
              id: z.number(),
              app_id: z.number(),
              account: z.object({ login: z.string() }),
            }),
          ),
        }),
      );
      installations.push(...batch.installations);
      if (installations.length >= batch.total_count) break;
      if (page === 20)
        throw new HttpError(413, "Too many App installations to inspect.");
    }
    const app = await store.app();
    if (!app) throw new HttpError(503, "Register your Ghrew App first.");
    const installation = installations.find(
      (i) =>
        i.app_id === app.id && i.account.login.toLowerCase() === organization,
    );
    if (!installation)
      throw new HttpError(
        409,
        "Install this deployment's Ghrew App in the organization, then retry.",
      );
    let workspace = await store.workspace(organization);
    if (!workspace) {
      workspace = {
        organization,
        repository: `${organization}/ghrew-chat`,
        vault: `${organization}/ghrew-vault`,
        installationId: installation.id,
        openRegistration: organization === sandbox.toLowerCase(),
        memberPrivateChannels: organization === sandbox.toLowerCase(),
        nonce: random(),
        ready: false,
      };
      await store.saveWorkspace(workspace);
    }
    if (workspace.installationId !== installation.id)
      throw new HttpError(
        409,
        "This workspace was registered under another App installation. Ask its administrator to review the connection.",
      );
    if (workspace.ready) return workspace;
    for (const [name, isPrivate] of [
      ["ghrew-chat", false],
      ["ghrew-vault", true],
    ] as const) {
      const path = `/repos/${organization}/${name}`;
      const existing = await api.response(path);
      const description = `Ghrew workspace ${workspace.nonce}`;
      let repo: z.infer<typeof repoSchema>;
      if (existing.status === 404)
        repo = await api.api(
          `/orgs/${organization}/repos`,
          repoSchema,
          "POST",
          {
            name,
            private: isPrivate,
            description,
            auto_init: true,
            has_issues: false,
            has_discussions: true,
          },
        );
      else {
        if (!existing.ok)
          throw new HttpError(
            502,
            "Could not inspect existing workspace repositories.",
          );
        repo = repoSchema.parse(await existing.json());
        if (repo.description !== description || repo.private !== isPrivate)
          throw new HttpError(
            409,
            `${name} already exists. Ghrew will not overwrite or adopt an unrelated repository.`,
          );
      }
      if (!repo.has_discussions)
        await api.api(path, repoSchema, "PATCH", { has_discussions: true });
    }
    const admins: number[] = [];
    for (let page = 1; page <= 20; page++) {
      const owners = await api.api(
        `/orgs/${organization}/members?role=admin&per_page=100&page=${page}`,
        z.array(actorSchema),
      );
      admins.push(...owners.map((owner) => owner.id));
      if (owners.length < 100) break;
      if (page === 20)
        throw new HttpError(413, "Too many organization owners to inspect.");
    }
    if (!admins.includes(actor.id))
      throw new HttpError(
        403,
        "GitHub did not confirm your organization-owner role.",
      );
    const membersPath = `/repos/${workspace.vault}/contents/.ghrew/members.json`;
    const members = await api.response(membersPath);
    if (members.status === 404)
      await api.api(membersPath, z.unknown(), "PUT", {
        message: "Initialize Ghrew workspace membership",
        content: Buffer.from(
          JSON.stringify({
            version: 1,
            organization,
            admins,
            members: [actor],
            openRegistration: workspace.openRegistration,
            memberPrivateChannels: workspace.memberPrivateChannels,
            blocked: [],
          }),
        ).toString("base64"),
      });
    else if (!members.ok)
      throw new HttpError(502, "Could not verify workspace membership.");
    const channels = await api.api("/graphql", gqlSchema, "POST", {
      query:
        'query($owner:String!){repository(owner:$owner,name:"ghrew-chat"){id discussionCategories(first:20){nodes{id slug}} discussions(first:1){totalCount}}}',
      variables: { owner: organization },
    });
    const data = z
      .object({
        repository: z.object({
          id: z.string(),
          discussionCategories: z.object({
            nodes: z.array(z.object({ id: z.string(), slug: z.string() })),
          }),
          discussions: z.object({ totalCount: z.number() }),
        }),
      })
      .parse(channels.data);
    if (data.repository.discussions.totalCount === 0) {
      const category =
        data.repository.discussionCategories.nodes.find(
          (c) => c.slug === "general",
        ) || data.repository.discussionCategories.nodes[0];
      if (!category)
        throw new HttpError(
          409,
          "GitHub has not prepared Discussion categories yet. Retry shortly.",
        );
      const created = await api.api("/graphql", gqlSchema, "POST", {
        query:
          'mutation($repositoryId:ID!,$categoryId:ID!){createDiscussion(input:{repositoryId:$repositoryId,categoryId:$categoryId,title:"general",body:"Your crew on GitHub. Welcome to the workspace."}){discussion{id}}}',
        variables: {
          repositoryId: data.repository.id,
          categoryId: category.id,
        },
      });
      if (created.errors?.length || !created.data)
        throw new HttpError(502, "Could not create the general channel.");
    }
    await vaultOperation(
      store,
      app,
      workspace,
      actor,
      { op: "members" },
      crypto.randomUUID(),
    );
    workspace.ready = true;
    await store.saveWorkspace(workspace);
    return workspace;
  });
}

export async function vaultOperation(
  store: Store,
  app: App,
  workspace: Workspace,
  actor: z.infer<typeof actorSchema>,
  operation: unknown,
  nonce: string,
) {
  return store.locked("vault:" + workspace.organization, async () => {
    const deadline = Date.now() + 60_000;
    let calls = 0;
    const request: typeof fetch = async (input, init) => {
      if (++calls > 80 || Date.now() >= deadline)
        throw new HttpError(
          504,
          "This workspace operation took too long. Retry shortly.",
        );
      return githubFetch(input, {
        ...init,
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(20_000, deadline - Date.now())),
        ),
      });
    };
    const token = await installationToken(
      {
        repository: workspace.vault,
        appId: String(app.id),
        privateKey: app.pem,
        checkOrganizationRole: true,
      },
      request,
    );
    try {
      const roleResponse = await request(
        `https://api.github.com/orgs/${workspace.organization}/memberships/${actor.login}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      let organizationRole: "admin" | "member" | "outside" = "outside";
      if (roleResponse.ok) {
        const role = z
          .object({
            state: z.string(),
            role: z.enum(["admin", "member"]),
            user: actorSchema,
          })
          .parse(await roleResponse.json());
        if (role.user.id !== actor.id)
          throw new HttpError(
            403,
            "GitHub organization identity could not be verified.",
          );
        if (role.state === "active") organizationRole = role.role;
      } else if (roleResponse.status !== 404)
        throw new HttpError(
          502,
          "Could not verify current organization membership.",
        );
      return await executeVault(
        { repository: workspace.vault, organizationRole },
        actor,
        operation,
        nonce,
        token,
        request,
      );
    } finally {
      await githubFetch("https://api.github.com/installation/token", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  });
}
