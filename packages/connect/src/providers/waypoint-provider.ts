import { WaypointProvider } from '@sky-mavis/waypoint';

import { ChainIds } from '../common/chain';
import { WAYPOINT_CLIENT_ID } from '../common/constant';
import { ConnectorError, ConnectorErrorType } from '../types/connector-error';

export const requestWaypointProvider = (chainId?: number) => {
  const waypointProvider = WaypointProvider.create({
    clientId: WAYPOINT_CLIENT_ID,
    chainId: chainId || ChainIds.RoninMainet,
  });

  if (!waypointProvider) {
    throw new ConnectorError(ConnectorErrorType.PROVIDER_NOT_FOUND);
  }

  return waypointProvider;
};
