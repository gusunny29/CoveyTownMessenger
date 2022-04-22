import React, { createContext, useEffect, useRef, useState } from 'react';
import TextConversation, {
  ChatMessage,
  PlayersAddedToChatEvent,
  PlayersRemovedFromChatEvent,
} from '../../../../../classes/TextConversation';
import useCoveyAppState from '../../../../../hooks/useCoveyAppState';

type ChatContextType = {
  isChatWindowOpen: boolean;
  setIsChatWindowOpen: (isChatWindowOpen: boolean) => void;
  hasUnreadMessages: boolean;
  messages: ChatMessage[];
  conversation: TextConversation | null;
  chats: Map<TextConversation, ChatMessage[]>;
  selectedChat: TextConversation | null;
  setSelectedChat: (newChat: TextConversation | null) => void;
};

export const ChatContext = createContext<ChatContextType>(null!);

export const ChatProvider: React.FC = ({ children }) => {
  const { socket, userName } = useCoveyAppState();
  const isChatWindowOpenRef = useRef(false);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [conversation, setConversation] = useState<TextConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [chats, setChats] = useState<Map<TextConversation, ChatMessage[]>>(new Map());
  const [selectedChat, setSelectedChat] = useState<TextConversation | null>(null);

  useEffect(() => {
    if (conversation) {
      const handleMessageAdded = (message: ChatMessage) =>
        setMessages(oldMessages => [...oldMessages, message]);
      //TODO - store entire message queue on server?
      // conversation.getMessages().then(newMessages => setMessages(newMessages.items));
      conversation.onMessageAdded(handleMessageAdded);
      return () => {
        conversation.offMessageAdded(handleMessageAdded);
      };
    }
  }, [conversation]);

  useEffect(() => {
    // If the chat window is closed and there are new messages, set hasUnreadMessages to true
    if (!isChatWindowOpenRef.current && messages.length) {
      setHasUnreadMessages(true);
    }
  }, [messages]);

  useEffect(() => {
    isChatWindowOpenRef.current = isChatWindowOpen;
    if (isChatWindowOpen) setHasUnreadMessages(false);
  }, [isChatWindowOpen]);

  // useEffect(() => {
  //   if (socket) {
  //     const conv = new TextConversation(socket, userName, );
  //     setConversation(conv);
  //     return () => {
  //       conv.close();
  //     };
  //   }
  // }, [socket, userName, setConversation]);

  useEffect(() => {
    if (socket) {
      if (chats.size === 0) {
        chats.set(new TextConversation(socket, 'global', 'global', 'global chat'), []);
        setChats(chats);
      }
      const handlePlayersAddedToChat = (event: PlayersAddedToChatEvent) => {
        const chat = Array.from(chats.entries()).find(([c]) => c._chatID === event.chat._chatID);
        if (!chat) {
          const newChat = TextConversation.fromServerChat(socket, event.chat);
          setChats(oldChats => new Map([...oldChats, [newChat, []]]));
        } else {
          chat?.[0].addPlayers(event.newPlayers);
          setChats(oldChats => new Map(oldChats));
        }
      };
      const handlePlayersRemovedFromChat = (event: PlayersRemovedFromChatEvent) => {
        const chat = Array.from(chats.entries()).find(([c]) => c._chatID === event.chat._chatID);
        if (chat) {
          chat[0].removePlayers(event.removedPlayers);
          setChats(oldChats => new Map(oldChats));
        }
      };
      socket.on('playersAddedToChat', handlePlayersAddedToChat);
      socket.on('playersRemovedFromChat', handlePlayersRemovedFromChat);
      return () => {
        socket.off('playersAddedToChat', handlePlayersAddedToChat);
        socket.off('playersRemovedFromChat', handlePlayersRemovedFromChat);
      };
    }
  }, [socket]);

  return (
    <ChatContext.Provider
      value={{
        isChatWindowOpen,
        setIsChatWindowOpen,
        hasUnreadMessages,
        messages,
        conversation,
        chats,
        selectedChat,
        setSelectedChat
      }}>
      {children}
    </ChatContext.Provider>
  );
};
