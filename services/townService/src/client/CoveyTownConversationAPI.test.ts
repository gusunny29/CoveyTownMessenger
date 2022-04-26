import CORS from 'cors';
import Express from 'express';
import http from 'http';
import { mock, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { AddressInfo } from 'net';
import CoveyTownController from '../lib/CoveyTownController';
import CoveyTownsStore from '../lib/CoveyTownsStore';
import * as requestHandlers from '../requestHandlers/CoveyTownRequestHandlers';
import addTownRoutes from '../router/towns';
import Player from '../types/Player';
import PlayerSession from '../types/PlayerSession';
import { createConversationForTesting } from './TestUtils';
import TownsServiceClient, { ServerConversationArea } from './TownsServiceClient';

type TestTownData = {
  friendlyName: string;
  coveyTownID: string;
  isPubliclyListed: boolean;
  townUpdatePassword: string;
};

describe('Create Conversation Area API', () => {
  let server: http.Server;
  let apiClient: TownsServiceClient;

  async function createTownForTesting(
    friendlyNameToUse?: string,
    isPublic = false,
  ): Promise<TestTownData> {
    const friendlyName =
      friendlyNameToUse !== undefined
        ? friendlyNameToUse
        : `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
    const ret = await apiClient.createTown({
      friendlyName,
      isPubliclyListed: isPublic,
    });
    return {
      friendlyName,
      isPubliclyListed: isPublic,
      coveyTownID: ret.coveyTownID,
      townUpdatePassword: ret.coveyTownPassword,
    };
  }

  beforeAll(async () => {
    const app = Express();
    app.use(CORS());
    server = http.createServer(app);

    addTownRoutes(server, app);
    await server.listen();
    const address = server.address() as AddressInfo;

    apiClient = new TownsServiceClient(`http://127.0.0.1:${address.port}`);
  });
  afterAll(async () => {
    await server.close();
  });
  it('Executes without error when creating a new conversation', async () => {
    const testingTown = await createTownForTesting(undefined, true);
    const testingSession = await apiClient.joinTown({
      userName: nanoid(),
      coveyTownID: testingTown.coveyTownID,
    });
    await apiClient.createConversationArea({
      conversationArea: createConversationForTesting(),
      coveyTownID: testingTown.coveyTownID,
      sessionToken: testingSession.coveySessionToken,
    });
  });
});
describe('Handlers', () => {
  const mockCoveyTownStore = mock<CoveyTownsStore>();
  const mockCoveyTownController = mock<CoveyTownController>();
  const mockPlayerSession = mock<PlayerSession>();
  const mockPlayer = mock<Player>();
  beforeAll(() => {
    // Set up a spy for CoveyTownsStore that will always return our mockCoveyTownsStore as the singleton instance
    jest.spyOn(CoveyTownsStore, 'getInstance').mockReturnValue(mockCoveyTownStore);
  });
  beforeEach(() => {
    // Reset all mock calls, and ensure that getControllerForTown will always return the same mock controller
    mockReset(mockCoveyTownController);
    mockReset(mockCoveyTownStore);
    mockCoveyTownStore.getControllerForTown.mockReturnValue(mockCoveyTownController);
  });

  describe('conversationAreaCreateHandler', () => {
    it('Checks for a valid session token before creating a conversation area', () => {
      const coveyTownID = nanoid();
      const conversationArea: ServerConversationArea = {
        boundingBox: { height: 1, width: 1, x: 1, y: 1 },
        label: nanoid(),
        occupantsByID: [],
        topic: nanoid(),
      };
      const invalidSessionToken = nanoid();

      // Make sure to return 'undefined' regardless of what session token is passed
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(undefined);

      requestHandlers.conversationAreaCreateHandler({
        conversationArea,
        coveyTownID,
        sessionToken: invalidSessionToken,
      });
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(invalidSessionToken);
      expect(mockCoveyTownController.addConversationArea).not.toHaveBeenCalled();
    });
  });

  describe('chatCreateHandler', () => {
    const coveyTownID = nanoid();
    const sessionToken = nanoid();
    const chatName = nanoid();

    it('Checks that the town exists before creating a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(undefined);

      requestHandlers.chatCreateHandler({
        coveyTownID,
        sessionToken,
        chatName,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).not.toHaveBeenCalled();
      expect(mockCoveyTownController.createChat).not.toHaveBeenCalled();
    });

    it('Checks that the session token is valid before creating a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownController.getSessionByToken.mockReturnValue(undefined);

      requestHandlers.chatCreateHandler({
        coveyTownID,
        sessionToken,
        chatName,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(sessionToken);
      expect(mockCoveyTownController.createChat).not.toHaveBeenCalled();
    });

    it('Successfully creates a chat when given valid input', () => {
      // Make sure to return valid controller and player session token regardless of what town ID and session token given
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(mockCoveyTownController);
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(mockPlayerSession);

      requestHandlers.chatCreateHandler({
        coveyTownID: mockCoveyTownController.coveyTownID,
        sessionToken: mockPlayerSession.sessionToken,
        chatName,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(
        mockCoveyTownController.coveyTownID,
      );
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(
        mockPlayerSession.sessionToken,
      );
      expect(mockCoveyTownController.createChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('addPlayerHandler', () => {
    const coveyTownID = nanoid();
    const playerIDs = [nanoid()];
    const sessionToken = nanoid();
    const chatID = nanoid();

    it('Checks that the town exists before adding players to a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(undefined);

      requestHandlers.addPlayersHandler({
        coveyTownID,
        playerIDs,
        sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).not.toHaveBeenCalled();
      expect(mockCoveyTownController.addPlayersToChat).not.toHaveBeenCalled();
    });

    it('Checks that the session token is valid before adding players to a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownController.getSessionByToken.mockReturnValue(undefined);

      requestHandlers.addPlayersHandler({
        coveyTownID,
        playerIDs,
        sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(sessionToken);
      expect(mockCoveyTownController.addPlayersToChat).not.toHaveBeenCalled();
    });

    it('Successfully adds a player to a chat when given valid input', () => {
      // Make sure to return valid controller and player session token regardless of what town ID and session token given
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(mockCoveyTownController);
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(mockPlayerSession);

      requestHandlers.addPlayersHandler({
        coveyTownID: mockCoveyTownController.coveyTownID,
        playerIDs: [mockPlayer.id],
        sessionToken: mockPlayerSession.sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(
        mockCoveyTownController.coveyTownID,
      );
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(
        mockPlayerSession.sessionToken,
      );
      expect(mockCoveyTownController.addPlayersToChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('removePlayerHandler', () => {
    const coveyTownID = nanoid();
    const playerIDs = [nanoid()];
    const sessionToken = nanoid();
    const chatID = nanoid();

    it('Checks that the town exists before removing players from a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(undefined);

      requestHandlers.removePlayerHandler({
        coveyTownID,
        playerIDs,
        sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).not.toHaveBeenCalled();
      expect(mockCoveyTownController.removePlayersFromChat).not.toHaveBeenCalled();
    });

    it('Checks that the session token is valid before removing players from a chat', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownController.getSessionByToken.mockReturnValue(undefined);

      requestHandlers.removePlayerHandler({
        coveyTownID,
        playerIDs,
        sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(sessionToken);
      expect(mockCoveyTownController.removePlayersFromChat).not.toHaveBeenCalled();
    });

    it('Successfully removes a player from a chat when given valid input', () => {
      // Make sure to return valid controller and player session token regardless of what town ID and session token given
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(mockCoveyTownController);
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(mockPlayerSession);

      requestHandlers.removePlayerHandler({
        coveyTownID: mockCoveyTownController.coveyTownID,
        playerIDs: [mockPlayer.id],
        sessionToken: mockPlayerSession.sessionToken,
        chatID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(
        mockCoveyTownController.coveyTownID,
      );
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(
        mockPlayerSession.sessionToken,
      );
      expect(mockCoveyTownController.removePlayersFromChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('blockPlayerHandler', () => {
    const coveyTownID = nanoid();
    const sessionToken = nanoid();
    const blockedPlayerID = nanoid();

    it('Checks that the town exists before blocking a player', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(undefined);

      requestHandlers.blockPlayerHandler({
        coveyTownID,
        sessionToken,
        blockedPlayerID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).not.toHaveBeenCalled();
      expect(mockCoveyTownController.blockPlayer).not.toHaveBeenCalled();
    });

    it('Checks that the session token is valid before blocking a player', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownController.getSessionByToken.mockReturnValue(undefined);

      requestHandlers.blockPlayerHandler({
        coveyTownID,
        sessionToken,
        blockedPlayerID,
      });

      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(sessionToken);
      expect(mockCoveyTownController.blockPlayer).not.toHaveBeenCalled();
    });

    it('Successfully blocks a player when given valid input', () => {
      // Make sure to return valid controller and player session token regardless of what town ID and session token given
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(mockCoveyTownController);
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(mockPlayerSession);

      requestHandlers.blockPlayerHandler({
        coveyTownID: mockCoveyTownController.coveyTownID,
        sessionToken: mockPlayerSession.sessionToken,
        blockedPlayerID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(
        mockCoveyTownController.coveyTownID,
      );
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(
        mockPlayerSession.sessionToken,
      );
      expect(mockCoveyTownController.blockPlayer).toHaveBeenCalledTimes(1);
    });
  });

  describe('unblockPlayerHandler', () => {
    const coveyTownID = nanoid();
    const sessionToken = nanoid();
    const unblockedPlayerID = nanoid();

    it('Checks that the town exists before unblocking a player', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(undefined);

      requestHandlers.unblockPlayerHandler({
        coveyTownID,
        sessionToken,
        unblockedPlayerID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).not.toHaveBeenCalled();
      expect(mockCoveyTownController.unblockPlayer).not.toHaveBeenCalled();
    });

    it('Checks that the session token is valid before unblocking a player', () => {
      // Make sure to return 'undefined' regardless of what town ID is passed
      mockCoveyTownController.getSessionByToken.mockReturnValue(undefined);

      requestHandlers.unblockPlayerHandler({
        coveyTownID,
        sessionToken,
        unblockedPlayerID,
      });

      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(coveyTownID);
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(sessionToken);
      expect(mockCoveyTownController.unblockPlayer).not.toHaveBeenCalled();
    });

    it('Successfully unblocks a player when given valid input', () => {
      // Make sure to return valid controller and player session token regardless of what town ID and session token given
      mockCoveyTownStore.getControllerForTown.mockReturnValueOnce(mockCoveyTownController);
      mockCoveyTownController.getSessionByToken.mockReturnValueOnce(mockPlayerSession);

      requestHandlers.unblockPlayerHandler({
        coveyTownID: mockCoveyTownController.coveyTownID,
        sessionToken: mockPlayerSession.sessionToken,
        unblockedPlayerID,
      });
      expect(mockCoveyTownStore.getControllerForTown).toBeCalledWith(
        mockCoveyTownController.coveyTownID,
      );
      expect(mockCoveyTownController.getSessionByToken).toBeCalledWith(
        mockPlayerSession.sessionToken,
      );
      expect(mockCoveyTownController.unblockPlayer).toHaveBeenCalledTimes(1);
    });
  });
});
