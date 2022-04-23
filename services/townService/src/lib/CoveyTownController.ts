import { customAlphabet, nanoid } from 'nanoid';
import { BoundingBox, ServerConversationArea } from '../client/TownsServiceClient';
import { ChatMessage, UserLocation } from '../CoveyTypes';
import Chat from '../types/Chat';
import CoveyTownListener from '../types/CoveyTownListener';
import Player from '../types/Player';
import PlayerSession from '../types/PlayerSession';
import IVideoClient from './IVideoClient';
import TwilioVideo from './TwilioVideo';

const friendlyNanoID = customAlphabet('1234567890ABCDEF', 8);
const GLOBAL_CHAT_ID = 'global';
const GLOBAL_CHAT_NAME = 'Global Chat';

/**
 * The CoveyTownController implements the logic for each town: managing the various events that
 * can occur (e.g. joining a town, moving, leaving a town)
 */
export default class CoveyTownController {
  get capacity(): number {
    return this._capacity;
  }

  set isPubliclyListed(value: boolean) {
    this._isPubliclyListed = value;
  }

  get isPubliclyListed(): boolean {
    return this._isPubliclyListed;
  }

  get townUpdatePassword(): string {
    return this._townUpdatePassword;
  }

  get players(): Player[] {
    return this._players;
  }

  get occupancy(): number {
    return this._listeners.length;
  }

  get friendlyName(): string {
    return this._friendlyName;
  }

  set friendlyName(value: string) {
    this._friendlyName = value;
  }

  get coveyTownID(): string {
    return this._coveyTownID;
  }

  get conversationAreas(): ServerConversationArea[] {
    return this._conversationAreas;
  }

  /** The list of players currently in the town * */
  private _players: Player[] = [];

  /** The list of valid sessions for this town * */
  private _sessions: PlayerSession[] = [];

  /** The videoClient that this CoveyTown will use to provision video resources * */
  private _videoClient: IVideoClient = TwilioVideo.getInstance();

  /** The list of CoveyTownListeners that are subscribed to events in this town * */
  private _listeners: CoveyTownListener[] = [];

  /** The list of currently active ConversationAreas in this town */
  private _conversationAreas: ServerConversationArea[] = [];

  private readonly _coveyTownID: string;

  private _friendlyName: string;

  private readonly _townUpdatePassword: string;

  private _isPubliclyListed: boolean;

  private _capacity: number;

  /** The list of active chats associated with this town */
  private _chats: Chat[];

  constructor(friendlyName: string, isPubliclyListed: boolean) {
    this._coveyTownID = process.env.DEMO_TOWN_ID === friendlyName ? friendlyName : friendlyNanoID();
    this._capacity = 50;
    this._townUpdatePassword = nanoid(24);
    this._isPubliclyListed = isPubliclyListed;
    this._friendlyName = friendlyName;
    this._chats = [new Chat(GLOBAL_CHAT_ID, GLOBAL_CHAT_NAME, GLOBAL_CHAT_ID)];
  }

  /**
   * Adds a player to this Covey Town, provisioning the necessary credentials for the
   * player, and returning them
   *
   * @param newPlayer The new player to add to the town
   */
  async addPlayer(newPlayer: Player): Promise<PlayerSession> {
    const theSession = new PlayerSession(newPlayer);

    this._sessions.push(theSession);
    this._players.push(newPlayer);

    // Create a video token for this user to join this town
    theSession.videoToken = await this._videoClient.getTokenForTown(
      this._coveyTownID,
      newPlayer.id,
    );

    // Notify other players that this player has joined
    this._listeners.forEach(listener => listener.onPlayerJoined(newPlayer));

    // Add Player to global chat
    this.addPlayersToChat([newPlayer.id], GLOBAL_CHAT_ID);

    return theSession;
  }

  /**
   * Destroys all data related to a player in this town.
   *
   * @param session PlayerSession to destroy
   */
  destroySession(session: PlayerSession): void {
    this._players = this._players.filter(p => p.id !== session.player.id);
    this._sessions = this._sessions.filter(s => s.sessionToken !== session.sessionToken);
    this._listeners.forEach(listener => listener.onPlayerDisconnected(session.player));
    const conversation = session.player.activeConversationArea;
    if (conversation) {
      this.removePlayerFromConversationArea(session.player, conversation);
    }
    this._chats.forEach(chat => {
      this.removePlayersFromChat([session.player.id], chat.getChatID());
    });
  }

  /**
   * Updates the location of a player within the town
   *
   * If the player has changed conversation areas, this method also updates the
   * corresponding ConversationArea objects tracked by the town controller, and dispatches
   * any onConversationUpdated events as appropriate
   *
   * @param player Player to update location for
   * @param location New location for this player
   */
  updatePlayerLocation(player: Player, location: UserLocation): void {
    const conversation = this.conversationAreas.find(
      conv => conv.label === location.conversationLabel,
    );
    const prevConversation = player.activeConversationArea;

    player.location = location;
    player.activeConversationArea = conversation;

    if (conversation !== prevConversation) {
      if (prevConversation) {
        this.removePlayerFromConversationArea(player, prevConversation);
      }
      if (conversation) {
        conversation.occupantsByID.push(player.id);
        this._listeners.forEach(listener => listener.onConversationAreaUpdated(conversation));
      }
    }

    this._listeners.forEach(listener => listener.onPlayerMoved(player));
  }

  /**
   * Removes a player from a conversation area, updating the conversation area's occupants list,
   * and emitting the appropriate message (area updated or area destroyed)
   *
   * Does not update the player's activeConversationArea property.
   *
   * @param player Player to remove from conversation area
   * @param conversation Conversation area to remove player from
   */
  removePlayerFromConversationArea(player: Player, conversation: ServerConversationArea): void {
    conversation.occupantsByID.splice(
      conversation.occupantsByID.findIndex(p => p === player.id),
      1,
    );
    if (conversation.occupantsByID.length === 0) {
      this._conversationAreas.splice(
        this._conversationAreas.findIndex(conv => conv === conversation),
        1,
      );
      this._listeners.forEach(listener => listener.onConversationAreaDestroyed(conversation));
    } else {
      this._listeners.forEach(listener => listener.onConversationAreaUpdated(conversation));
    }
  }

  /**
   * Creates a new conversation area in this town if there is not currently an active
   * conversation with the same label.
   *
   * Adds any players who are in the region defined by the conversation area to it.
   *
   * Notifies any CoveyTownListeners that the conversation has been updated
   *
   * @param _conversationArea Information describing the conversation area to create. Ignores any
   *  occupantsById that are set on the conversation area that is passed to this method.
   *
   * @returns true if the conversation is successfully created, or false if not
   */
  addConversationArea(_conversationArea: ServerConversationArea): boolean {
    if (
      this._conversationAreas.find(
        eachExistingConversation => eachExistingConversation.label === _conversationArea.label,
      )
    )
      return false;
    if (_conversationArea.topic === '') {
      return false;
    }
    if (
      this._conversationAreas.find(eachExistingConversation =>
        CoveyTownController.boxesOverlap(
          eachExistingConversation.boundingBox,
          _conversationArea.boundingBox,
        ),
      ) !== undefined
    ) {
      return false;
    }
    const newArea: ServerConversationArea = Object.assign(_conversationArea);
    this._conversationAreas.push(newArea);
    const playersInThisConversation = this.players.filter(player => player.isWithin(newArea));
    playersInThisConversation.forEach(player => {
      player.activeConversationArea = newArea;
    });
    newArea.occupantsByID = playersInThisConversation.map(player => player.id);
    this._listeners.forEach(listener => listener.onConversationAreaUpdated(newArea));
    return true;
  }

  /**
   * Detects whether two bounding boxes overlap and share any points
   *
   * @param box1
   * @param box2
   * @returns true if the boxes overlap, otherwise false
   */
  static boxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    // Helper function to extract the top left (x1,y1) and bottom right corner (x2,y2) of each bounding box
    const toRectPoints = (box: BoundingBox) => ({
      x1: box.x - box.width / 2,
      x2: box.x + box.width / 2,
      y1: box.y - box.height / 2,
      y2: box.y + box.height / 2,
    });
    const rect1 = toRectPoints(box1);
    const rect2 = toRectPoints(box2);
    const noOverlap =
      rect1.x1 >= rect2.x2 || rect2.x1 >= rect1.x2 || rect1.y1 >= rect2.y2 || rect2.y1 >= rect1.y2;
    return !noOverlap;
  }

  /**
   * Subscribe to events from this town. Callers should make sure to
   * unsubscribe when they no longer want those events by calling removeTownListener
   *
   * @param listener New listener
   */
  addTownListener(listener: CoveyTownListener): void {
    this._listeners.push(listener);
  }

  /**
   * Unsubscribe from events in this town.
   *
   * @param listener The listener to unsubscribe, must be a listener that was registered
   * with addTownListener, or otherwise will be a no-op
   */
  removeTownListener(listener: CoveyTownListener): void {
    this._listeners = this._listeners.filter(v => v !== listener);
  }

  /**
   * Route chat message to the appropriate recipients
   * @param message
   */
  onChatMessage(message: ChatMessage): void {
    const chat = this._chats.find(ch => ch.getChatID() === message.chatID);
    if (chat) {
      this._listeners.forEach(listener => {
        if (chat.getPlayers().includes(listener.playerId)) {
          listener.onChatMessage(message);
        }
      });
      // TODO remove this._listeners.forEach(listener => listener.onChatMessage(message));
    }
  }

  /**
   * Fetch a player's session based on the provided session token. Returns undefined if the
   * session token is not valid.
   *
   * @param token
   */
  getSessionByToken(token: string): PlayerSession | undefined {
    return this._sessions.find(p => p.sessionToken === token);
  }

  disconnectAllPlayers(): void {
    this._listeners.forEach(listener => listener.onTownDestroyed());
  }

  /**
   * Adds Players to the chat
   * @param playerIDs playerIDs of players to be added to chat
   * @param chatID ID of chat
   * @returns if adding was successful
   */
  addPlayersToChat(playerIDs: string[], chatID: string): boolean {
    const newPlayers: string[] = [];
    const chat = this._chats.find(c => c.getChatID() === chatID);
    if (chat) {
      playerIDs.forEach(playerID => {
        chat.addPlayer(playerID);
        newPlayers.push(playerID);
      });
      this._listeners.forEach(listener => {
        if (chat.getPlayers().includes(listener.playerId)) {
          listener.onPlayersAddedToChat(chat, newPlayers);
        }
      });
      return true;
    }
    return false;
  }

  /**
   * Removes a player from the given chat
   *
   * @param playerIDs represents the players we are removing
   * @param chatID represents the chat we are removing the players from
   */
  removePlayersFromChat(playerIDs: string[], chatID: string): boolean {
    const chat = this._chats.find(c => c.getChatID() === chatID);
    if (chat) {
      this._listeners.forEach(listener => {
        if (chat.getPlayers().includes(listener.playerId)) {
          listener.onPlayersRemovedFromChat(chat, playerIDs);
        }
      });
      playerIDs.map(pl => this.removePlayerHelper(chat, pl));
    }
    return false;
  }

  /**
   * Helps validate if removing a player is valid and to validate then if a player is removed
   * @param chat Chat Player is to be removed from
   * @param playerID playerID of player to be removed
   * @returns Whether result was successful
   */

  removePlayerHelper(chat: Chat, playerID: string): boolean {
    let success = true;
    if (!chat.removePlayer(playerID)) {
      success = false;
    }
    if (chat.getPlayers().length === 0) {
      this._chats.splice(
        this._chats.findIndex(ch => ch === chat),
        1,
      );
    }

    return success;
  }

  /**
   * Creates a chat and adds it to the town's list of chats
   *
   * @param authorID represents the unique ID of the chat's author
   * @param chatName represents the name of the chat
   * @returns whether or not the chat was created successfully
   */
  createChat(authorID: string, chatName: string): Chat {
    const chat = new Chat(authorID, chatName);
    this._chats.push(chat);
    const author = this._listeners.find(listener => listener.playerId === authorID);
    if (author) {
      author.onPlayersAddedToChat(chat, [authorID]);
    }
    return chat;
  }

  /**
   * Adds a player's id to the list of blocked player id's for a player
   *
   * @param blockingPlayerID represents the unique ID of blocking player
   * @param blockedPlayerID represents the unique ID of the player to block
   * @returns whether the player was successfully blocked
   */
  blockPlayer(blockingPlayerID: string, blockedPlayerID: string): boolean {
    const blockingPlayer = this.players.find(p => p.id === blockingPlayerID);
    const blockedPlayer = this.players.find(p => p.id === blockedPlayerID);
    if (blockingPlayer && blockedPlayer) {
      blockingPlayer.addBlockedPlayerID(blockedPlayerID);
      this._listeners.forEach(listener => {
        listener.onPlayerBlocked(blockingPlayerID, blockedPlayerID);
      });
      return true;
    }
    return false;
  }

  /**
   * Removes a player from being blocked, so that messages and conversations can now be made with the unblocked player
   * @param unblockingPlayerID unique ID of the player unblocking the blocked player
   * @param unblockedPlayerID unique ID of the player being unblocked
   * @returns whether the player was successfully unblocked
   */
  unblockPlayer(unblockingPlayerID: string, unblockedPlayerID: string): boolean {
    const unblockingPlayer = this.players.find(p => p.id === unblockingPlayerID);
    const unblockedPlayer = this.players.find(p => p.id === unblockedPlayerID);
    if (unblockingPlayer && unblockedPlayer) {
      unblockingPlayer.removeBlockedPlayerID(unblockedPlayerID);
      return true;
    }
    return false;
  }
}
