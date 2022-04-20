import { CloseButton, Flex, Heading, HStack, IconButton, useDisclosure } from '@chakra-ui/react';
import React from 'react';
import useChatContext from '../../../hooks/useChatContext/useChatContext';
import AddIcon from '../../../icons/AddIcon';
import { CreateChatModal } from '../ChatModals/CreateChatModal';

export default function ChatWindowHeader({
  title,
  showAddButton,
}: {
  title: string;
  showAddButton: boolean;
}) {
  const { setIsChatWindowOpen } = useChatContext();
  const {
    isOpen: isCreateChatModalOpen,
    onClose: onCloseCreateChatModal,
    onOpen: onOpenCreateChatModal,
  } = useDisclosure();

  return (
    <Flex
      h='56px'
      justifyContent='space-between'
      background='#F4F4F6'
      borderBottom='1px solid #E4E7E9'
      align='center'
      paddingX='1em'>
      <Heading size='sm'>{title}</Heading>
      <HStack>
        {showAddButton && (
          <IconButton
            icon={<AddIcon />}
            size='sm'
            aria-label='new-chat'
            onClick={onOpenCreateChatModal}
          />
        )}
        <CloseButton onClick={() => setIsChatWindowOpen(false)} />
      </HStack>
      <CreateChatModal
        isOpen={isCreateChatModalOpen}
        onClose={onCloseCreateChatModal}
        onOpen={onOpenCreateChatModal}
      />
    </Flex>
  );
}
