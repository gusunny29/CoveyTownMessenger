import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import clsx from 'clsx';
import useChatContext from '../../hooks/useChatContext/useChatContext';
import { ChatList } from '../ChatList/ChatList';
import ChatInput from './ChatInput/ChatInput';
import ChatWindowHeader from './ChatWindowHeader/ChatWindowHeader';
import MessageList from './MessageList/MessageList';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    chatWindowContainer: {
      'background': '#FFFFFF',
      'zIndex': 1000,
      'display': 'flex',
      'flexDirection': 'column',
      'borderLeft': '1px solid #E4E7E9',
      [theme.breakpoints.down('sm')]: {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: 100,
      },
      'position': 'fixed',
      'bottom': 0,
      'left': 0,
      'top': 0,
      'max-width': '250px',
    },
    hide: {
      display: 'none',
    },
  }),
);

// In this component, we are toggling the visibility of the ChatWindow with CSS instead of
// conditionally rendering the component in the DOM. This is done so that the ChatWindow is
// not unmounted while a file upload is in progress.

export default function ChatWindow() {
  const classes = useStyles();
  const { isChatWindowOpen, chats, selectedChat } = useChatContext();

  return (
    <aside className={clsx(classes.chatWindowContainer, { [classes.hide]: !isChatWindowOpen })}>
      <ChatWindowHeader title={'Chat'} showAddButton={true} />
      {selectedChat && (
        <>
          <MessageList
            messages={
              Array.from(chats.entries()).find(c => c[0]._chatID === selectedChat._chatID)?.[1]
            }
          />
          <ChatInput conversation={selectedChat} isChatWindowOpen={isChatWindowOpen} />
        </>
      )}
      {!selectedChat && <ChatList />}
    </aside>
  );
}
