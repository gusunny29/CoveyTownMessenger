import { Box, VStack } from "@chakra-ui/react"
import useChatContext from "../../hooks/useChatContext/useChatContext";

export const ChatList = () => {
  const { chats, setSelectedChat } = useChatContext();
  return (
    <VStack minW='250px'>
    {Array.from(chats.keys()).map(chat => {
        return(
          <Box h='50px' bg='gray.200' width='100%' onClick={() => setSelectedChat(chat)} cursor='pointer' key={chat._chatID}>
            {chat._chatName}
          </Box>
        );
      })}
    </VStack>
  )
}