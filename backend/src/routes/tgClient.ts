import { Router } from 'express';
import {
  getLiveClient,
  loadDialogs,
  getMessages,
  sendMessage,
  getContacts,
  addContact,
  searchPeers,
  fetchPhoto,
  subscribeToMessages,
  getFolders,
} from '../tg/liveClient';

const router = Router();

// GET /:accountId/folders
router.get('/:accountId/folders', async (req, res) => {
  const accountId = Number(req.params.accountId);
  try {
    const entry = await getLiveClient(accountId);
    res.json(await getFolders(entry));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/dialogs
router.get('/:accountId/dialogs', async (req, res) => {
  const accountId = Number(req.params.accountId);
  try {
    const entry = await getLiveClient(accountId);
    const dialogs = await loadDialogs(entry);
    res.json(dialogs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/messages/:chatId?limit=50&offsetId=0
router.get('/:accountId/messages/:chatId', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const chatId = req.params.chatId;
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const offsetId = Number(req.query.offsetId ?? 0);
  try {
    const entry = await getLiveClient(accountId);
    const msgs = await getMessages(entry, chatId, limit, offsetId);
    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:accountId/messages/:chatId -- send a message
router.post('/:accountId/messages/:chatId', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const chatId = req.params.chatId;
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: 'text is required' }); return; }
  try {
    const entry = await getLiveClient(accountId);
    const result = await sendMessage(entry, chatId, text.trim());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/contacts
router.get('/:accountId/contacts', async (req, res) => {
  const accountId = Number(req.params.accountId);
  try {
    const entry = await getLiveClient(accountId);
    const contacts = await getContacts(entry);
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:accountId/contacts -- add by phone number
router.post('/:accountId/contacts', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const { phone, firstName, lastName } = req.body as { phone?: string; firstName?: string; lastName?: string };
  if (!phone || !firstName) { res.status(400).json({ error: 'phone and firstName are required' }); return; }
  try {
    const entry = await getLiveClient(accountId);
    const contact = await addContact(entry, phone, firstName, lastName ?? '');
    if (!contact) { res.status(404).json({ error: 'Phone number not found on Telegram' }); return; }
    res.json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/search?q=
router.get('/:accountId/search', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const q = String(req.query.q ?? '').trim();
  if (!q) { res.json([]); return; }
  try {
    const entry = await getLiveClient(accountId);
    const results = await searchPeers(entry, q);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/messages/:chatId/:msgId/photo -- fetch photo for a message
router.get('/:accountId/messages/:chatId/:msgId/photo', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const chatId = req.params.chatId;
  const msgId = Number(req.params.msgId);
  try {
    const entry = await getLiveClient(accountId);
    const buf = await fetchPhoto(entry, chatId, msgId);
    if (!buf) { res.status(404).json({ error: 'Photo not found' }); return; }
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:accountId/events -- SSE stream for real-time messages
router.get('/:accountId/events', async (req, res) => {
  const accountId = Number(req.params.accountId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':\n\n');

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Ensure client is alive so the event handler is registered
    await getLiveClient(accountId);

    const heartbeat = setInterval(() => res.write(':\n\n'), 25_000);

    const unsubscribe = subscribeToMessages(accountId, (msg) => {
      send({ type: 'message', ...msg });
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err: any) {
    send({ type: 'error', error: err.message });
    res.end();
  }
});

export default router;
