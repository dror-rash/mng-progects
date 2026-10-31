const NOTE_NAME_LENGTH = 60;

/** A note's name on the Deleted page (notes have no title): its first line, shortened to 60 characters. */
export function noteName(body: string): string {
  const line = body.trim().split("\n")[0]!.trim();
  return line.length > NOTE_NAME_LENGTH ? `${line.slice(0, NOTE_NAME_LENGTH - 1)}…` : line;
}
