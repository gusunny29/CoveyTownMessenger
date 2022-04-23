import {
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import useCoveyAppState from '../../../../../../hooks/useCoveyAppState';
import useMaybeVideo from '../../../../../../hooks/useMaybeVideo';
import usePlayersInTown from '../../../../../../hooks/usePlayersInTown';
import { GenericManageChatModal } from './GenericManageChatModal';
import { SelectChatPlayers } from './SelectChatPlayers';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({ isOpen, onClose, onOpen }) => {
  const players = usePlayersInTown();
  const { myPlayerID, apiClient, sessionToken, currentTownID } = useCoveyAppState();
  const [chatName, setChatName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const video = useMaybeVideo();
  const [textInputFocused, setTextInputFocused] = useState(false);

  useEffect(() => {
    if (textInputFocused) {
      video?.pauseGame();
    } else {
      video?.unPauseGame();
    }
  }, [textInputFocused]);

  const handleCreateChat = () => {
    if (apiClient && sessionToken && chatName) {
      apiClient
        .createChat({ sessionToken, chatName, coveyTownID: currentTownID })
        .then((chat) => apiClient.addPlayersToChat({ sessionToken, coveyTownID: currentTownID, playerIDs: selectedPlayers, chatID: chat._chatID }))
        .then(() => {
          onClose();
        })
        .catch(() => {});
    }
  };

  return (
    <GenericManageChatModal
      isOpen={isOpen}
      onClose={onClose}
      onOpen={onOpen}
      title='Create a Chat'
      onSave={handleCreateChat}>
      <FormControl>
        <FormLabel>Chat Name</FormLabel>
        <Input
          placeholder='New Chat Name'
          value={chatName}
          onChange={e => setChatName(e.target.value)}
          onFocus={() => setTextInputFocused(true)}
          onBlur={() => setTextInputFocused(false)}
        />
        <FormHelperText>Give a name to your chat</FormHelperText>
      </FormControl>
      <SelectChatPlayers selectedPlayers={selectedPlayers} setSelectedPlayers={setSelectedPlayers} ownerID={myPlayerID}/>
    </GenericManageChatModal>
  );
};
