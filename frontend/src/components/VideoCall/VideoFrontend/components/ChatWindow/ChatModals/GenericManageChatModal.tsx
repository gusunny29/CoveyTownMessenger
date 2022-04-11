import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';

interface ManageChatModalProps extends Disclosure {
  onSave: () => void;
  title: string;
}

export const GenericManageChatModal: React.FC<ManageChatModalProps> = ({
  isOpen,
  onClose,
  onSave,
  children,
  title,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <HStack w='100%'>
            <Button w='100%' variant='ghost' mr={3} onClick={onClose}>
              Close
            </Button>
            <Button w='100%' colorScheme='teal' onClick={onSave}>
              Save
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
