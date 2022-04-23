import { Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react';
import useCoveyAppState from '../../../../../../hooks/useCoveyAppState';
import usePlayersInTown from '../../../../../../hooks/usePlayersInTown';
import useChatContext from '../../../hooks/useChatContext/useChatContext';
import { GenericManageChatModal } from './GenericManageChatModal';
import { SelectChatPlayers } from './SelectChatPlayers';
import { chakra } from '@chakra-ui/react';

interface EditChatModalProps extends Disclosure {}

export const EditChatModal: React.FC<EditChatModalProps> = ({ isOpen, onClose, onOpen }) => {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const { myPlayerID, apiClient, sessionToken, currentTownID } = useCoveyAppState();
  const { selectedChat } = useChatContext();
  const players = usePlayersInTown();

  const handleEditChat = () => {
    if (apiClient && sessionToken && selectedChat?._chatName) {
      const removedPlayers = selectedChat._occupants.filter((player) => !selectedPlayers.includes(player));
      const addedPlayers = selectedPlayers.filter((player) => !selectedChat._occupants.includes(player));
      const promises: Promise<boolean>[] = [];
      if (removedPlayers.length > 0) {
        promises.push(apiClient.removePlayersFromChat({ sessionToken, coveyTownID: currentTownID, playerIDs: removedPlayers, chatID: selectedChat._chatID }));
      }
      if (addedPlayers.length > 0) {
        promises.push(apiClient.addPlayersToChat({ sessionToken, coveyTownID: currentTownID, playerIDs: addedPlayers, chatID: selectedChat._chatID}));
      }
      Promise.all(promises)
        .then(() => {
          onClose();
        })
        .catch(() => {});
    }
  };
  // Update the selected players each time a new chat is selected
  useEffect(() => {
    if (selectedChat) {
      setSelectedPlayers(selectedChat._occupants);
    }
  }, [selectedChat]);

  return (
    <GenericManageChatModal
      title='Edit Chat'
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onSave={handleEditChat}>
    <Text>
      Owner: {selectedChat?._ownerID === 'global' ? 'global' : players.find((player) => player.id === selectedChat?._ownerID)?.userName}
    </Text>  
      <SelectChatPlayers selectedPlayers={selectedPlayers} setSelectedPlayers={setSelectedPlayers} ownerID={selectedChat?._ownerID}/>
    </GenericManageChatModal>
  );
};
