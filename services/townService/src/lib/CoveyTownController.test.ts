import { mock, mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { Socket } from 'socket.io';
import * as TestUtils from '../client/TestUtils';
import { UserLocation } from '../CoveyTypes';
import { townSubscriptionHandler } from '../requestHandlers/CoveyTownRequestHandlers';
import CoveyTownListener from '../types/CoveyTownListener';
import Player from '../types/Player';
import PlayerSession from '../types/PlayerSession';
import CoveyTownController from './CoveyTownController';
import CoveyTownsStore from './CoveyTownsStore';
import TwilioVideo from './TwilioVideo';

const mockTwilioVideo = mockDeep<TwilioVideo>();
jest.spyOn(TwilioVideo, 'getInstance').mockReturnValue(mockTwilioVideo);

function generateTestLocation(): UserLocation {
  return {
    rotation: 'back',
    moving: Math.random() < 0.5,
    x: Math.floor(Math.random() * 100),
    y: Math.floor(Math.random() * 100),
  };
}

describe('CoveyTownController', () => {
  beforeEach(() => {
    mockTwilioVideo.getTokenForTown.mockClear();
  });
  it('constructor should set the friendlyName property', () => {
    const townName = `FriendlyNameTest-${nanoid()}`;
    const townController = new CoveyTownController(townName, false);
    expect(townController.friendlyName).toBe(townName);
  });
  describe('addPlayer', () => {
    it('should use the coveyTownID and player ID properties when requesting a video token', async () => {
      const townName = `FriendlyNameTest-${nanoid()}`;
      const townController = new CoveyTownController(townName, false);
      const newPlayerSession = await townController.addPlayer(new Player(nanoid()));
      expect(mockTwilioVideo.getTokenForTown).toBeCalledTimes(1);
      expect(mockTwilioVideo.getTokenForTown).toBeCalledWith(
        townController.coveyTownID,
        newPlayerSession.player.id,
      );
    });
  });
  describe('town listeners and events', () => {
    let testingTown: CoveyTownController;
    const mockListeners = [
      mock<CoveyTownListener>(),
      mock<CoveyTownListener>(),
      mock<CoveyTownListener>(),
    ];
    beforeEach(() => {
      const townName = `town listeners and events tests ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
      mockListeners.forEach(mockReset);
    });
    it('should notify added listeners of player movement when updatePlayerLocation is called', async () => {
      const player = new Player('test player');
      await testingTown.addPlayer(player);
      const newLocation = generateTestLocation();
      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      testingTown.updatePlayerLocation(player, newLocation);
      mockListeners.forEach(listener => expect(listener.onPlayerMoved).toBeCalledWith(player));
    });
    it('should notify added listeners of player disconnections when destroySession is called', async () => {
      const player = new Player('test player');
      const session = await testingTown.addPlayer(player);

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      testingTown.destroySession(session);
      mockListeners.forEach(listener =>
        expect(listener.onPlayerDisconnected).toBeCalledWith(player),
      );
    });
    it('should notify added listeners of new players when addPlayer is called', async () => {
      mockListeners.forEach(listener => testingTown.addTownListener(listener));

      const player = new Player('test player');
      await testingTown.addPlayer(player);
      mockListeners.forEach(listener => expect(listener.onPlayerJoined).toBeCalledWith(player));
    });
    it('should notify added listeners that the town is destroyed when disconnectAllPlayers is called', async () => {
      const player = new Player('test player');
      await testingTown.addPlayer(player);

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      testingTown.disconnectAllPlayers();
      mockListeners.forEach(listener => expect(listener.onTownDestroyed).toBeCalled());
    });
    it('should not notify removed listeners of player movement when updatePlayerLocation is called', async () => {
      const player = new Player('test player');
      await testingTown.addPlayer(player);

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      const newLocation = generateTestLocation();
      const listenerRemoved = mockListeners[1];
      testingTown.removeTownListener(listenerRemoved);
      testingTown.updatePlayerLocation(player, newLocation);
      expect(listenerRemoved.onPlayerMoved).not.toBeCalled();
    });
    it('should not notify removed listeners of player disconnections when destroySession is called', async () => {
      const player = new Player('test player');
      const session = await testingTown.addPlayer(player);

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      const listenerRemoved = mockListeners[1];
      testingTown.removeTownListener(listenerRemoved);
      testingTown.destroySession(session);
      expect(listenerRemoved.onPlayerDisconnected).not.toBeCalled();
    });
    it('should not notify removed listeners of new players when addPlayer is called', async () => {
      const player = new Player('test player');

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      const listenerRemoved = mockListeners[1];
      testingTown.removeTownListener(listenerRemoved);
      const session = await testingTown.addPlayer(player);
      testingTown.destroySession(session);
      expect(listenerRemoved.onPlayerJoined).not.toBeCalled();
    });

    it('should not notify removed listeners that the town is destroyed when disconnectAllPlayers is called', async () => {
      const player = new Player('test player');
      await testingTown.addPlayer(player);

      mockListeners.forEach(listener => testingTown.addTownListener(listener));
      const listenerRemoved = mockListeners[1];
      testingTown.removeTownListener(listenerRemoved);
      testingTown.disconnectAllPlayers();
      expect(listenerRemoved.onTownDestroyed).not.toBeCalled();
    });
  });
  describe('townSubscriptionHandler', () => {
    const mockSocket = mock<Socket>();
    let testingTown: CoveyTownController;
    let player: Player;
    let session: PlayerSession;
    beforeEach(async () => {
      const townName = `connectPlayerSocket tests ${nanoid()}`;
      testingTown = CoveyTownsStore.getInstance().createTown(townName, false);
      mockReset(mockSocket);
      player = new Player('test player');
      session = await testingTown.addPlayer(player);
    });
    it('should reject connections with invalid town IDs by calling disconnect', async () => {
      TestUtils.setSessionTokenAndTownID(nanoid(), session.sessionToken, mockSocket);
      townSubscriptionHandler(mockSocket);
      expect(mockSocket.disconnect).toBeCalledWith(true);
    });
    it('should reject connections with invalid session tokens by calling disconnect', async () => {
      TestUtils.setSessionTokenAndTownID(testingTown.coveyTownID, nanoid(), mockSocket);
      townSubscriptionHandler(mockSocket);
      expect(mockSocket.disconnect).toBeCalledWith(true);
    });
    describe('with a valid session token', () => {
      it('should add a town listener, which should emit "newPlayer" to the socket when a player joins', async () => {
        TestUtils.setSessionTokenAndTownID(
          testingTown.coveyTownID,
          session.sessionToken,
          mockSocket,
        );
        townSubscriptionHandler(mockSocket);
        await testingTown.addPlayer(player);
        expect(mockSocket.emit).toBeCalledWith('newPlayer', player);
      });
      it('should add a town listener, which should emit "playerMoved" to the socket when a player moves', async () => {
        TestUtils.setSessionTokenAndTownID(
          testingTown.coveyTownID,
          session.sessionToken,
          mockSocket,
        );
        townSubscriptionHandler(mockSocket);
        testingTown.updatePlayerLocation(player, generateTestLocation());
        expect(mockSocket.emit).toBeCalledWith('playerMoved', player);
      });
      it('should add a town listener, which should emit "playerDisconnect" to the socket when a player disconnects', async () => {
        TestUtils.setSessionTokenAndTownID(
          testingTown.coveyTownID,
          session.sessionToken,
          mockSocket,
        );
        townSubscriptionHandler(mockSocket);
        testingTown.destroySession(session);
        expect(mockSocket.emit).toBeCalledWith('playerDisconnect', player);
      });
      it('should add a town listener, which should emit "townClosing" to the socket and disconnect it when disconnectAllPlayers is called', async () => {
        TestUtils.setSessionTokenAndTownID(
          testingTown.coveyTownID,
          session.sessionToken,
          mockSocket,
        );
        townSubscriptionHandler(mockSocket);
        testingTown.disconnectAllPlayers();
        expect(mockSocket.emit).toBeCalledWith('townClosing');
        expect(mockSocket.disconnect).toBeCalledWith(true);
      });
      describe('when a socket disconnect event is fired', () => {
        it('should remove the town listener for that socket, and stop sending events to it', async () => {
          TestUtils.setSessionTokenAndTownID(
            testingTown.coveyTownID,
            session.sessionToken,
            mockSocket,
          );
          townSubscriptionHandler(mockSocket);

          // find the 'disconnect' event handler for the socket, which should have been registered after the socket was connected
          const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
          if (disconnectHandler && disconnectHandler[1]) {
            disconnectHandler[1]();
            const newPlayer = new Player('should not be notified');
            await testingTown.addPlayer(newPlayer);
            expect(mockSocket.emit).not.toHaveBeenCalledWith('newPlayer', newPlayer);
          } else {
            fail('No disconnect handler registered');
          }
        });
        it('should destroy the session corresponding to that socket', async () => {
          TestUtils.setSessionTokenAndTownID(
            testingTown.coveyTownID,
            session.sessionToken,
            mockSocket,
          );
          townSubscriptionHandler(mockSocket);

          // find the 'disconnect' event handler for the socket, which should have been registered after the socket was connected
          const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
          if (disconnectHandler && disconnectHandler[1]) {
            disconnectHandler[1]();
            mockReset(mockSocket);
            TestUtils.setSessionTokenAndTownID(
              testingTown.coveyTownID,
              session.sessionToken,
              mockSocket,
            );
            townSubscriptionHandler(mockSocket);
            expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
          } else {
            fail('No disconnect handler registered');
          }
        });
      });
      it('should forward playerMovement events from the socket to subscribed listeners', async () => {
        TestUtils.setSessionTokenAndTownID(
          testingTown.coveyTownID,
          session.sessionToken,
          mockSocket,
        );
        townSubscriptionHandler(mockSocket);
        const mockListener = mock<CoveyTownListener>();
        testingTown.addTownListener(mockListener);
        // find the 'playerMovement' event handler for the socket, which should have been registered after the socket was connected
        const playerMovementHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'playerMovement',
        );
        if (playerMovementHandler && playerMovementHandler[1]) {
          const newLocation = generateTestLocation();
          player.location = newLocation;
          playerMovementHandler[1](newLocation);
          expect(mockListener.onPlayerMoved).toHaveBeenCalledWith(player);
        } else {
          fail('No playerMovement handler registered');
        }
      });
    });
  });
  describe('addConversationArea', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `addConversationArea test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });
    it('should add the conversation area to the list of conversation areas', () => {
      const newConversationArea = TestUtils.createConversationForTesting();
      const result = testingTown.addConversationArea(newConversationArea);
      expect(result).toBe(true);
      const areas = testingTown.conversationAreas;
      expect(areas.length).toEqual(1);
      expect(areas[0].label).toEqual(newConversationArea.label);
      expect(areas[0].topic).toEqual(newConversationArea.topic);
      expect(areas[0].boundingBox).toEqual(newConversationArea.boundingBox);
    });
  });
  describe('updatePlayerLocation', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });
    it("should respect the conversation area reported by the player userLocation.conversationLabel, and not override it based on the player's x,y location", async () => {
      const newConversationArea = TestUtils.createConversationForTesting({
        boundingBox: { x: 10, y: 10, height: 5, width: 5 },
      });
      const result = testingTown.addConversationArea(newConversationArea);
      expect(result).toBe(true);
      const player = new Player(nanoid());
      await testingTown.addPlayer(player);

      const newLocation: UserLocation = {
        moving: false,
        rotation: 'front',
        x: 25,
        y: 25,
        conversationLabel: newConversationArea.label,
      };
      testingTown.updatePlayerLocation(player, newLocation);
      expect(player.activeConversationArea?.label).toEqual(newConversationArea.label);
      expect(player.activeConversationArea?.topic).toEqual(newConversationArea.topic);
      expect(player.activeConversationArea?.boundingBox).toEqual(newConversationArea.boundingBox);

      const areas = testingTown.conversationAreas;
      expect(areas[0].occupantsByID.length).toBe(1);
      expect(areas[0].occupantsByID[0]).toBe(player.id);
    });
    it('should emit an onConversationUpdated event when a conversation area gets a new occupant', async () => {
      const newConversationArea = TestUtils.createConversationForTesting({
        boundingBox: { x: 10, y: 10, height: 5, width: 5 },
      });
      const result = testingTown.addConversationArea(newConversationArea);
      expect(result).toBe(true);

      const mockListener = mock<CoveyTownListener>();
      testingTown.addTownListener(mockListener);

      const player = new Player(nanoid());
      await testingTown.addPlayer(player);
      const newLocation: UserLocation = {
        moving: false,
        rotation: 'front',
        x: 25,
        y: 25,
        conversationLabel: newConversationArea.label,
      };
      testingTown.updatePlayerLocation(player, newLocation);
      expect(mockListener.onConversationAreaUpdated).toHaveBeenCalledTimes(1);
    });
  });

  describe('onChatMessage', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });

    it('Should emit an onChatMessage even to every player in the chat when recieving a chat message', () => {
      const player1 = new Player(nanoid());
      const player2 = new Player(nanoid());
      const player3 = new Player(nanoid());
      const player4 = new Player(nanoid());
      const testDate = new Date();

      const testChat = testingTown.createChat(player1.id, 'Test Chat');
      const result = testingTown.addPlayersToChat([player2.id, player3.id], testChat.getChatID());
      expect(result).toBe(true);

      const mockPlayer2Listener = mock<CoveyTownListener>();
      mockPlayer2Listener.playerId = player2.id;
      const mockPlayer3Listener = mock<CoveyTownListener>();
      mockPlayer3Listener.playerId = player3.id;
      const mockPlayer4Listener = mock<CoveyTownListener>();
      mockPlayer4Listener.playerId = player4.id;
      testingTown.addTownListener(mockPlayer2Listener);
      testingTown.addTownListener(mockPlayer3Listener);
      testingTown.addTownListener(mockPlayer4Listener);

      testingTown.onChatMessage({
        chatID: testChat.getChatID(),
        author: player1.id,
        sid: nanoid(),
        body: 'Test Message',
        dateCreated: testDate,
      });

      expect(mockPlayer2Listener.onChatMessage).toHaveBeenCalledTimes(1);
      expect(mockPlayer3Listener.onChatMessage).toHaveBeenCalledTimes(1);
      expect(mockPlayer4Listener.onChatMessage).toHaveBeenCalledTimes(0);
    });
  });

  describe('addPlayersToChat', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });

    it('Should add the players to the list of players within the chat', () => {
      const player1 = new Player(nanoid());
      const player2 = new Player(nanoid());
      const player3 = new Player(nanoid());
      const player4 = new Player(nanoid());

      const testChat = testingTown.createChat(player1.id, 'Test Chat');
      const result = testingTown.addPlayersToChat([player2.id, player3.id], testChat.getChatID());
      expect(result).toBe(true);
      expect(testChat.getPlayers()).toContain(player1.id);
      expect(testChat.getPlayers()).toContain(player2.id);
      expect(testChat.getPlayers()).toContain(player3.id);
      expect(testChat.getPlayers()).not.toContain(player4.id);
    });
  });

  describe('removePlayersFromChat', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });

    it('Should remove the players from the list of players within the chat', () => {
      const player1 = new Player(nanoid());
      const player2 = new Player(nanoid());
      const player3 = new Player(nanoid());
      const player4 = new Player(nanoid());

      const testChat = testingTown.createChat(player1.id, 'Test Chat');
      const result1 = testingTown.addPlayersToChat(
        [player2.id, player3.id, player4.id],
        testChat.getChatID(),
      );
      expect(result1).toBe(true);
      const result2 = testingTown.removePlayersFromChat(
        [player2.id, player3.id],
        testChat.getChatID(),
      );
      expect(result2).toBe(true);
      expect(testChat.getPlayers()).toContain(player1.id);
      expect(testChat.getPlayers()).not.toContain(player2.id);
      expect(testChat.getPlayers()).not.toContain(player3.id);
      expect(testChat.getPlayers()).toContain(player4.id);
    });
  });

  describe('createChat', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });

    it('Should add the new chat to the list of chats, and add the author of the chat as a chat member', () => {
      const player1 = new Player(nanoid());

      const testChat = testingTown.createChat(player1.id, 'Test Chat');

      const { chats } = testingTown;
      expect(chats.length).toBe(2); // Should be 2 because global chat is created by default
      expect(chats[1].getChatID()).toBe(testChat.getChatID());
      expect(chats[1].getChatName()).toBe(testChat.getChatName());
    });
  });

  describe('blockPlayer', () => {
    let testingTown: CoveyTownController;
    let player1: Player;
    let player2: Player;
    let mockListener: CoveyTownListener;
    beforeEach(async () => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
      player1 = new Player('test player 1');
      player2 = new Player('test player 2');
      await testingTown.addPlayer(player1);
      await testingTown.addPlayer(player2);

      mockListener = mock<CoveyTownListener>();
      testingTown.addTownListener(mockListener);
    });
    it('When a player is blocked, that player should be added to the list of blocked players', () => {
      expect(player1.getBlockedPlayerIDs.length).toEqual(0);
      testingTown.blockPlayer(player1.id, player2.id);
      expect(player1.getBlockedPlayerIDs.length).toEqual(1);
      expect(player1.getBlockedPlayerIDs[0]).toEqual(player2.id);

      expect(mockListener.onPlayerUnblocked).not.toHaveBeenCalled();
    });
    it('When a player does not exist inside the CoveyTown, we should not be able to block them', async () => {
      const player3 = new Player('test player 3');

      testingTown.blockPlayer(player1.id, player3.id);
      expect(player1.getBlockedPlayerIDs.length).toEqual(0);
      expect(player1.getBlockedPlayerIDs[0]).not.toEqual(player3.id);

      expect(mockListener.onPlayerBlocked).toHaveBeenCalledTimes(0);
      expect(mockListener.onPlayerUnblocked).not.toHaveBeenCalled();
    });
    it('When the player blocking does not exist in the town, they shouldnt be able to block', () => {
      const player3 = new Player('test player 3');

      expect(player3.getBlockedPlayerIDs.length).toEqual(0);
      testingTown.blockPlayer(player3.id, player2.id);
      expect(player3.getBlockedPlayerIDs.length).toEqual(0);
      expect(player3.getBlockedPlayerIDs[0]).not.toEqual(player2.id);

      expect(mockListener.onPlayerUnblocked).not.toHaveBeenCalled();
    });
    it('Should be able to block multiple players and have them show up seamlessly in the blocked players list', async () => {
      const player3 = new Player('test player 3');
      await testingTown.addPlayer(player3);

      expect(player3.getBlockedPlayerIDs.length).toEqual(0);
      // Blocking first player
      testingTown.blockPlayer(player3.id, player2.id);
      expect(player3.getBlockedPlayerIDs.length).toEqual(1);
      expect(player3.getBlockedPlayerIDs[0]).toEqual(player2.id);
      // Blocking second player
      testingTown.blockPlayer(player3.id, player1.id);
      expect(player3.getBlockedPlayerIDs.length).toEqual(2);
      expect(player3.getBlockedPlayerIDs[0]).toEqual(player2.id);
      expect(player3.getBlockedPlayerIDs[1]).toEqual(player1.id);

      expect(mockListener.onPlayerUnblocked).not.toHaveBeenCalled();
    });
    it('Should be able to block a player that exists and then doesnt block a player since they dont exist in the town', () => {
      const player3 = new Player('test player 3');

      expect(player1.getBlockedPlayerIDs.length).toEqual(0);
      // Blocking first player
      testingTown.blockPlayer(player1.id, player2.id);
      expect(player1.getBlockedPlayerIDs.length).toEqual(1);
      expect(player1.getBlockedPlayerIDs[0]).toEqual(player2.id);
      // Blocking second player but shouldnt work
      testingTown.blockPlayer(player1.id, player3.id);
      expect(player1.getBlockedPlayerIDs.length).toEqual(1);
      expect(player1.getBlockedPlayerIDs[0]).toEqual(player2.id);
      expect(player1.getBlockedPlayerIDs[1]).not.toEqual(player3.id);

      expect(mockListener.onPlayerUnblocked).not.toHaveBeenCalled();
    });
  });

  describe('unblockPlayer', () => {
    let testingTown: CoveyTownController;
    beforeEach(() => {
      const townName = `updatePlayerLocation test town ${nanoid()}`;
      testingTown = new CoveyTownController(townName, false);
    });

    it('Should call removeBlockedPlayerID on the approriate player with the appropriate player input, and should emit an onPlayerUnblocked to the player doing the ublocking', () => {
      const player1 = new Player(nanoid());
      const player2 = new Player(nanoid());

      testingTown.addPlayer(player1);
      testingTown.addPlayer(player2);

      const result1 = testingTown.blockPlayer(player1.id, player2.id);
      expect(result1).toBe(true);
      expect(player1.getBlockedPlayerIDs.length).toBe(1);
      expect(player1.getBlockedPlayerIDs).toContain(player2.id);
      const result2 = testingTown.unblockPlayer(player1.id, player2.id);
      expect(result2).toBe(true);
      expect(player1.getBlockedPlayerIDs.length).toBe(0);
    });

    it('Should return false when a player tries to unblock a player that does not exist in the town, or when a player that does not exist in the town tries to unblock a player', () => {
      const player1 = new Player(nanoid());
      const player2 = new Player(nanoid());
      const player3 = new Player(nanoid());

      testingTown.addPlayer(player1);
      testingTown.addPlayer(player2);

      const result1 = testingTown.blockPlayer(player1.id, player2.id);
      expect(result1).toBe(true);
      const result2 = testingTown.unblockPlayer(player1.id, player3.id);
      expect(result2).toBe(false);
      expect(player1.getBlockedPlayerIDs.length).toBe(1);
      expect(player1.getBlockedPlayerIDs).toContain(player2.id);
      const result3 = testingTown.unblockPlayer(player3.id, player1.id);
      expect(result3).toBe(false);
    });
  });
});
