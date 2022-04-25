import assert from 'assert';
import { useContext } from 'react';
import BlockedPlayersContext from '../contexts/BlockedPlayersContext';

export default function useBlockedPlayers(): string[] {
  const ctx = useContext(BlockedPlayersContext);
  assert(ctx, 'BlockedPlayersContext context should be defined.');
  return ctx;
}
