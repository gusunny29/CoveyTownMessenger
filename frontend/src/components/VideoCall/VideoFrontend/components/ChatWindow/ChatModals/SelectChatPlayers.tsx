import { Flex, Tag, TagLabel, TagCloseButton, Select } from "@chakra-ui/react";
import useCoveyAppState from "../../../../../../hooks/useCoveyAppState";
import usePlayersInTown from "../../../../../../hooks/usePlayersInTown";

interface SelectChatPlayersProps {
    selectedPlayers: string[],
    setSelectedPlayers: (newPlayers: string[]) => void
    ownerID?: string;
  }

export const SelectChatPlayers: React.FC<SelectChatPlayersProps> = ({selectedPlayers, setSelectedPlayers, ownerID}) => {
    const players = usePlayersInTown();
    const { myPlayerID, apiClient, sessionToken, currentTownID } = useCoveyAppState();
    const isOwner = ownerID === myPlayerID;

    return (
        <>
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
                            {isOwner && <TagCloseButton
                            onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p !== playerID))}
                            />}
                        </Tag>
                        );
                    })}
                </Flex>
                <Select
                    isDisabled={!isOwner}
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
            </>
    );
                    }