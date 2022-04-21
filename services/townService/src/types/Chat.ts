import { nanoid } from 'nanoid';

/**
 * A basic representation of a chat, containing a unique ID,
 * a list of recipients for the chat and a unique author for the chat.
 */
export default class Chat {
  private _chatID: string;

  // storing date as well to keep track of eldest member for chat in case author leaves
  private _recipientIDs: Map<string, Date> = new Map();

  private _authorID: string;

  private _chatName: string;

  /**
   * Create a new Chat
   *
   * @param authorID unique ID associated with the author of the chat
   */
  public constructor(authorID: string, chatName: string) {
    this._authorID = authorID;
    this._recipientIDs.set(authorID, new Date());
    this._chatID = nanoid();
    this._chatName = chatName;
  }

  /**
   * Adds the given player to the Chat
   * @param playerID represents the unique player's id
   */
  public addPlayer(playerID: string): void {
    this._recipientIDs.set(playerID, new Date());
  }

  /**
   * Rempves the given player from the Chat
   * @param playerID represents the unique player's id
   */
  public removePlayer(playerID: string): boolean {
    const deleted = this._recipientIDs.delete(playerID);

    // if player being removed is currently the author -> set the new author to be the eldest member
    if (playerID === this._authorID) {
      const newAuthorID = this.findNewAuthorID();

      if (newAuthorID) {
        this._authorID = newAuthorID;
      }
    }

    return deleted;
  }

  /**
   * Returns all the unique player id's associated with this chat
   */
  public getPlayers(): string[] {
    const recipientIDs = this._recipientIDs.keys();
    return Array.from(recipientIDs);
  }

  /**
   * Returns the chat ID
   */
  public getChatID(): string {
    return this._chatID;
  }

  /**
   * Sets the chat name
   */
  public setChatName(chatName: string): void {
    this._chatName = chatName;
  }

  /**
   * Returns the chat name
   */
  public getChatName(): string {
    return this._chatName;
  }

  private findNewAuthorID(): string | undefined {
    const oldestJoinDate = Array.from(this._recipientIDs.values()).sort(
      (a, b) => a.getTime() - b.getTime(),
    )[0];

    return Array.from(this._recipientIDs.entries()).find(
      entry => entry[1].getTime() === oldestJoinDate.getTime(),
    )?.[0];
  }
}
