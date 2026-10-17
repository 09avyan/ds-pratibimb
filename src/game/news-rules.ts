import type { News } from "./types";

type Story = Pick<News, "headline" | "topic" | "direction">;
export function newsContradicts(a: Story, b: Story) {
  if (a.direction === b.direction) return false;
  const topic = (story: Story) => story.topic ?? (/loan costs/i.test(story.headline) ? "economy-credit-cost" : story.headline.toLowerCase());
  return topic(a) === topic(b);
}
export function validateNewsSelection(selected: Story[], published: Story[] = []) {
  for (let i = 0; i < selected.length; i++) {
    if ([...published, ...selected.slice(0, i)].some(other => newsContradicts(selected[i], other))) {
      throw new Error("These stories reverse the same event. Choose a different story for this batch.");
    }
  }
}
