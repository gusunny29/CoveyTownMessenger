import { nanoid } from 'nanoid';
import { Socket } from 'socket.io-client';

/**
 * A basic representation of a text conversation, bridged over a socket.io client
 * The interface to this class was designed to closely resemble the Twilio Conversations API,
 * to make it easier to use as a drop-in replacement.
 */
export default class TextConversation {
  private _socket: Socket;

  private _callbacks: MessageCallback[] = [];

  private _authorName: string;

  _occupants: string[];

  _chatID: string;

  /**
   * Create a new Text Conversation
   *
   * @param socket socket to use to send/receive messages
   * @param authorName name of message author to use as sender
   */
  public constructor(socket: Socket, authorID: string, chatID: string) {
    this._chatID = chatID;
    this._occupants = [];
    this._socket = socket;
    this._authorName = authorID;
    this._socket.on('chatMessage', (message: ChatMessage) => {
      message.dateCreated = new Date(message.dateCreated);
      this.onChatMessage(message);
    });
  }

  private onChatMessage(message: ChatMessage) {
    this._callbacks.forEach(cb => cb(message));
  }

  /**
   * Send a text message to this channel
   * @param message
   */
  public sendMessage(message: string) {
    const msg: ChatMessage = {
      chatID: this._chatID,
      sid: nanoid(),
      body: message,
      author: this._authorName,
      dateCreated: new Date(),
    };
    this._socket.emit('chatMessage', msg);
  }

  /**
   * Register an event listener for processing new chat messages
   * @param event
   * @param cb
   */
  public onMessageAdded(cb: MessageCallback) {
    this._callbacks.push(cb);
  }

  /**
   * Removes an event listener for processing new chat messages
   * @param cb
   */
  public offMessageAdded(cb: MessageCallback) {
    this._callbacks = this._callbacks.filter(_cb => _cb !== cb);
  }

  /**
   * Release the resources used by this conversation
   */
  public close(): void {
    this._socket.off('chatMessage');
  }

  public static fromServerChat(socket: Socket, chat: ServerChat): TextConversation {
    return new TextConversation(socket, chat._authorID, chat._chatID);
  }

  public addPlayers(players: string[]) {
    this._occupants = this._occupants.concat(players);
  }

  public removePlayers(players: string[]) {
    this._occupants = this._occupants.filter(p => !players.includes(p));
  }
}
type MessageCallback = (message: ChatMessage) => void;
export type ChatMessage = {
  chatID: string;
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
};

interface ServerChat {
  _chatID: string;
  _recipientIDs: string[];
  _authorID: string;
  _chatName: string;
}

export interface PlayersAddedToChatEvent {
  chat: ServerChat;
  newPlayers: string[];
}

export interface PlayersRemovedFromChatEvent {
  chat: ServerChat;
  removedPlayers: string[];
}
