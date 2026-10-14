import type { Channel, Message } from "../../shared/chat";

export const previewChannels: Channel[] = [
  {
    id: "preview-general",
    name: "general",
    description: "The room for everyday things",
  },
  {
    id: "preview-building",
    name: "building",
    description: "Small steps, shared progress",
  },
  {
    id: "preview-little-things",
    name: "little-things",
    description: "The things that make a good day",
  },
];

export function previewMessages(): Message[] {
  const samples: [string, string, string, string, number][] = [
    [
      "preview-welcome",
      "preview-general",
      "",
      "I’ve sketched the first room layout. The composer stays at the bottom, even with a long conversation.",
      -8,
    ],
    [
      "preview-guide",
      "preview-general",
      "",
      "Can we keep the room visible when someone opens a thread? I want to reply without losing my place.",
      -7,
    ],
    [
      "preview-reply-1",
      "preview-general",
      "preview-guide",
      "Yes. Put the thread beside the conversation on desktop. On a phone, give it its own screen.",
      -6,
    ],
    [
      "preview-reply-2",
      "preview-general",
      "preview-guide",
      "That works. And keep the room draft exactly where I left it.",
      -5,
    ],
    [
      "preview-question",
      "preview-general",
      "",
      "I’ll try the narrow-screen layout after lunch. Leave any rough edges in this thread.",
      -3,
    ],
    [
      "preview-building-1",
      "preview-building",
      "",
      "First pass is ready to try. Check room switching, a long message, and a draft after a reload.",
      -4,
    ],
    [
      "preview-little-1",
      "preview-little-things",
      "",
      "Today’s small discovery: the best time to catch the quiet street is just before the coffee shop opens.",
      -2,
    ],
  ];
  return samples.map(([id, channelId, parentId, body, minutes], index) => {
    const time = new Date(Date.now() + minutes * 60_000).toISOString();
    return {
      id,
      channelId,
      parentId,
      body,
      author: index % 2 ? "Denis" : "Mira",
      createdAt: time,
      updatedAt: time,
      status: "local",
      url: "",
    };
  });
}
