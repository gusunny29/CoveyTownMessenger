import { CloseButton, Flex, Heading, HStack, IconButton, useDisclosure } from '@chakra-ui/react';
import React from 'react';
import useChatContext from '../../../hooks/useChatContext/useChatContext';
import AddIcon from '../../../icons/AddIcon';
import BackIcon from '../../../icons/BackIcon';
import SettingsIcon from '../../../icons/SettingsIcon';
import { CreateChatModal } from '../ChatModals/CreateChatModal';
import { EditChatModal } from '../ChatModals/EditChatModal';

export default function ChatWindowHeader({
  showAddButton,
}: {
  showAddButton: boolean;
}) {
  const { setIsChatWindowOpen, setSelectedChat, selectedChat } = useChatContext();
  const {
    isOpen: isCreateChatModalOpen,
    onClose: onCloseCreateChatModal,
    onOpen: onOpenCreateChatModal,
  } = useDisclosure();
  const {
    isOpen: isEditChatModalOpen,
    onClose: onCloseEditChatModal,
    onOpen: onOpenEditChatModal,
  } = useDisclosure();

  return (
    <Flex
      h='56px'
      justifyContent='space-between'
      background='#F4F4F6'
      borderBottom='1px solid #E4E7E9'
      align='center'
      paddingX='1em'>
      {selectedChat && (
          <IconButton
            icon={<BackIcon />}
            size='sm'
            aria-label='back-to-chat-list'
            onClick={() => setSelectedChat(null)}
          />
        )}
      <Heading size='sm'>{selectedChat?._chatName ?? "Chat"}</Heading>
      <HStack>
        {showAddButton && (
          <IconButton
            icon={selectedChat ? <SettingsIcon /> : <AddIcon />}
            size='sm'
            aria-label='new-chat'
            onClick={selectedChat ? onOpenEditChatModal : onOpenCreateChatModal}
          />
        )}
        <CloseButton onClick={() => setIsChatWindowOpen(false)} />
      </HStack>
      <CreateChatModal
        isOpen={isCreateChatModalOpen}
        onClose={onCloseCreateChatModal}
        onOpen={onOpenCreateChatModal}
      />
      <EditChatModal
        isOpen={isEditChatModalOpen}
        onClose={onCloseEditChatModal}
        onOpen={onOpenEditChatModal}
      />
    </Flex>
  );
}
