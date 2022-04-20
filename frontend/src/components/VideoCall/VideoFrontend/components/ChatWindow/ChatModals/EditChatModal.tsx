import { useState } from 'react';
import { GenericManageChatModal } from './GenericManageChatModal';

interface EditChatModalProps extends Disclosure {}

export const EditChatModal: React.FC<EditChatModalProps> = ({ isOpen, onClose, onOpen }) => {
  const [chatName, setChatName] = useState('');
  return (
    <GenericManageChatModal
      title='Edit Chat'
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onSave={() => {}}></GenericManageChatModal>
  );
};
