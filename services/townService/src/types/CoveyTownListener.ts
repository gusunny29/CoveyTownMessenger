import { ServerConversationArea } from '../client/TownsServiceClient';
import { ChatMessage } from '../CoveyTypes';
import Chat from './Chat';
import Player from './Player';

/**
 * A listener for player-related events in each town
 */
export default interface CoveyTownListener {
  /**
   * Called when a player joins a town
   * @param newPlayer the new player
   */
  onPlayerJoined(newPlayer: Player): void;

  /**
   * Called when a player's location changes
   * @param movedPlayer the player that moved
   */
  onPlayerMoved(movedPlayer: Player): void;

  /**
   * Called when a player disconnects from the town
   * @param removedPlayer the player that disconnected
   */
  onPlayerDisconnected(removedPlayer: Player): void;

  /**
   * Called when a town is destroyed, causing all players to disconnect
   */
  onTownDestroyed(): void;

  /**
   * Called when a conversation area is created or updated
   * @param conversationArea the conversation area that is updated or created
   */
  onConversationAreaUpdated(conversationArea: ServerConversationArea): void;

  /**
   * Called when a conversation area is destroyed
   * @param conversationArea the conversation area that has been destroyed
   */
  onConversationAreaDestroyed(conversationArea: ServerConversationArea): void;

  /**
   * Called when a chat message is received from a user
   * @param message the new chat message
   */
  onChatMessage(message: ChatMessage): void;

  /**
   * Called when new players are added to a chat.
   * @param chat the chat that the new players were added to
   * @param newPlayers the new players that were added
   */
  onPlayersAddedToChat(chat: Chat, newPlayers: string[]): void;

  /**
   * Called when players are removed from a chat.
   * @param chat the chat that the players were removed from
   * @param removedPlayers the players that were removed
   */
  onPlayersRemovedFromChat(chat: Chat, removedPlayers: string[]): void;

  playerId: string;

  /**
   * Called when a player blocks another player
   * @param blockingPlayerId the ID of the player who is doing the blocking
   * @param blockedPlayerId the ID of the player who is being blocked
   */
  onPlayerBlocked(blockingPlayerId: string, blockedPlayerID: string): void;

  /**
   * Called when a player is unblocked
   */

  onPlayerUnblocked(unblockingPlayerID: string, unblockedPlayer: string): void;
}
