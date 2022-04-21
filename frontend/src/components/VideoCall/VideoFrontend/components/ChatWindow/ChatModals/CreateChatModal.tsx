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
      <Flex gap='1em' justifyContent='center' my='2em' flexWrap='wrap'>
        {Array.from(selectedPlayers.values()).map(playerID => {
          const player = players.find(p => p.id === playerID);
          if (player)
            return (
              <Tag
                minW='50px'
                maxW='300px'
                size='md'
                key={player.id}
                borderRadius='full'
                variant='solid'
                colorScheme='teal'>
                <TagLabel>{player.userName}</TagLabel>
                <TagCloseButton
                  onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p !== playerID))}
                />
              </Tag>
            );
        })}
      </Flex>
      <Select
        placeholder='Select a Player to Add'
        onChange={e => {
          const player = players.find(p => p.id === e.target.value);
          if (player && !selectedPlayers.includes(player.id)) {
            setSelectedPlayers([...selectedPlayers, player.id]);
          }
        }}>
        {players
          .filter(player => player.id !== myPlayerID)
          .map(player => (
            <option
              disabled={selectedPlayers.includes(player.id)}
              key={player.id}
              value={player.id}>
              {player.userName}
            </option>
          ))}
      </Select>
    </GenericManageChatModal>
  );
};
