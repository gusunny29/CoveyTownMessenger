import {
  Button,
  HStack,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import React from 'react';
import useBlockedPlayers from '../../hooks/useBlockedPlayers';
import useCoveyAppState from '../../hooks/useCoveyAppState';
import usePlayersInTown from '../../hooks/usePlayersInTown';
import { ViewIcon } from '../VideoCall/VideoFrontend/icons/ViewIcon';

interface PeopleSettingsProps {
  disabled: boolean;
}

const PeopleSettings: React.FC<PeopleSettingsProps> = ({ disabled }) => {
  const { isOpen, onClose, onToggle } = useDisclosure();
  const players = usePlayersInTown();
  const blockedPlayers = useBlockedPlayers();
  const { apiClient, sessionToken, currentTownID } = useCoveyAppState();
  const toast = useToast();

  const handleBlock = (playerId: string) => {
    apiClient
      .blockPlayer({
        sessionToken,
        coveyTownID: currentTownID,
        blockedPlayer: playerId,
      })
      .then(() => {
        onClose();
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'There was an error blocking the player.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  const handleUnblock = (playerId: string) => {
    apiClient
      .unblockPlayer({
        sessionToken,
        coveyTownID: currentTownID,
        unblockedPlayer: playerId,
      })
      .then(() => {
        onClose();
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'There was an error unblocking the player.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };

  return (
    <>
      <Button
        fontWeight={400}
        variant='ghost'
        data-cy-chat-button
        onClick={onToggle}
        disabled={disabled}
        leftIcon={<ViewIcon color='gray.500' />}>
        People
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>People</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <List>
              {players.map(player => {
                const isBlocked = blockedPlayers.includes(player.id);
                return (
                  <ListItem key={player.id}>
                    <HStack justify='space-between'>
                      <Text>{player.userName}</Text>
                      <Button
                        colorScheme='red'
                        onClick={() =>
                          isBlocked ? handleUnblock(player.id) : handleBlock(player.id)
                        }>
                        {isBlocked ? 'Unblock' : 'Block'}
                      </Button>
                    </HStack>
                  </ListItem>
                );
              })}
            </List>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PeopleSettings;
