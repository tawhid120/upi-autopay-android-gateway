import { Response } from 'express';

// Active SSE client streams for hosted checkout pages: orderId -> Set<Response>
const activeStreams = new Map<string, Set<Response>>();

export function registerCheckoutStream(orderId: string, res: Response) {
  if (!activeStreams.has(orderId)) {
    activeStreams.set(orderId, new Set());
  }
  activeStreams.get(orderId)!.add(res);

  // Clean up on disconnect
  res.on('close', () => {
    const clients = activeStreams.get(orderId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        activeStreams.delete(orderId);
      }
    }
  });
}

export function notifyCheckoutStream(orderId: string, payload: any) {
  const clients = activeStreams.get(orderId);
  if (!clients || clients.size === 0) return;

  const dataString = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(dataString);
    } catch (e) {
      // client already closed
    }
  }
}
