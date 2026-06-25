"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { api, KanbanBoard, KanbanBoardFull, KanbanCard, fmtDate } from "@/lib/api";

const COVERS = [
  "linear-gradient(150deg,#7aa2ff,#5b8def)",
  "linear-gradient(150deg,#4cd07d,#2f9e5b)",
  "linear-gradient(150deg,#ff9ecb,#e7559e)",
  "linear-gradient(150deg,#f6b24b,#e8842b)",
  "linear-gradient(150deg,#a78bfa,#7a55d6)",
];
const cover = (id: string) => COVERS[(id.charCodeAt(0) + (id.charCodeAt(1) || 0)) % COVERS.length];

export default function KanbanApp() {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [board, setBoard] = useState<KanbanBoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // create-board modal
  const [showCreate, setShowCreate] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [busy, setBusy] = useState(false);

  // inline inputs
  const [addingList, setAddingList] = useState(false);
  const [listText, setListText] = useState("");
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [cardText, setCardText] = useState("");
  const [dragCard, setDragCard] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setBoards(await api.kanbanBoards()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadBoards(); }, [loadBoards]);

  const openBoard = async (id: string) => {
    setErr(null);
    try { setBoard(await api.kanbanBoard(id)); } catch (e: any) { setErr(e.message); }
  };

  const createBoard = async () => {
    if (!cTitle.trim()) return;
    setBusy(true);
    try {
      const b = await api.kanbanCreateBoard(cTitle.trim(), cDesc.trim() || undefined);
      setShowCreate(false); setCTitle(""); setCDesc("");
      await loadBoards();
      openBoard(b.id);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Delete this board and all its lists/cards?")) return;
    try { await api.kanbanDeleteBoard(id); setBoard(null); await loadBoards(); } catch (e: any) { setErr(e.message); }
  };

  const addList = async () => {
    if (!board || !listText.trim()) return;
    try {
      const l = await api.kanbanCreateList(board.id, listText.trim());
      setBoard({ ...board, lists: [...board.lists, l] });
      setListText(""); setAddingList(false);
    } catch (e: any) { setErr(e.message); }
  };

  const deleteList = async (listId: string) => {
    if (!board || !confirm("Delete this list and its cards?")) return;
    try { await api.kanbanDeleteList(listId); setBoard({ ...board, lists: board.lists.filter((l) => l.id !== listId) }); }
    catch (e: any) { setErr(e.message); }
  };

  const addCard = async (listId: string) => {
    if (!board || !cardText.trim()) return;
    try {
      const card = await api.kanbanCreateCard(listId, cardText.trim());
      setBoard({ ...board, lists: board.lists.map((l) => l.id === listId ? { ...l, cards: [...l.cards, card] } : l) });
      setCardText(""); setAddingCard(null);
    } catch (e: any) { setErr(e.message); }
  };

  const deleteCard = async (card: KanbanCard) => {
    if (!board) return;
    try {
      await api.kanbanDeleteCard(card.id);
      setBoard({ ...board, lists: board.lists.map((l) => l.id === card.list_id ? { ...l, cards: l.cards.filter((c) => c.id !== card.id) } : l) });
    } catch (e: any) { setErr(e.message); }
  };

  const dropOnList = async (listId: string) => {
    if (!board || !dragCard) return;
    const cardId = dragCard; setDragCard(null);
    let moved: KanbanCard | undefined;
    const stripped = board.lists.map((l) => {
      const found = l.cards.find((c) => c.id === cardId);
      if (found) moved = found;
      return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
    });
    if (!moved || moved.list_id === listId) return;
    const target = stripped.find((l) => l.id === listId)!;
    const pos = target.cards.length;
    const next = stripped.map((l) => l.id === listId ? { ...l, cards: [...l.cards, { ...moved!, list_id: listId, position: pos }] } : l);
    setBoard({ ...board, lists: next });
    try { await api.kanbanMoveCard(cardId, listId, pos); } catch (e: any) { setErr(e.message); openBoard(board.id); }
  };

  // ───── Board detail view ─────
  if (board) {
    return (
      <div className="kb">
        {err && <div className="note" style={{ margin: "0 0 12px" }}>{err}</div>}
        <div className="kb-bar">
          <button className="btn sm" onClick={() => { setBoard(null); loadBoards(); }}>
            <Icon name="chevr" style={{ transform: "rotate(180deg)" }} /> Back to Boards
          </button>
          <span className="kb-id" style={{ background: cover(board.id) }}>{board.title.charAt(0).toUpperCase()}</span>
          <b className="kb-name">{board.title}</b>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={() => setAddingList(true)}><Icon name="plus" /> Add List</button>
            <button className="icon-btn danger" title="Delete board" onClick={() => deleteBoard(board.id)}><Icon name="trash" /></button>
          </div>
        </div>

        <div className="kb-board">
          {board.lists.map((l) => (
            <div className="kb-col" key={l.id} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnList(l.id)}>
              <div className="kb-col-head">
                <span className="kb-grip"><Icon name="grip" /></span>
                <b>{l.title}</b>
                <span className="kb-count">{l.cards.length}</span>
                <button className="icon-btn sm" title="Delete list" onClick={() => deleteList(l.id)} style={{ marginLeft: "auto" }}><Icon name="x" /></button>
              </div>
              <div className="kb-cards">
                {l.cards.map((c) => (
                  <div className="kb-card" key={c.id} draggable
                    onDragStart={() => setDragCard(c.id)} onDragEnd={() => setDragCard(null)}>
                    <span>{c.title}</span>
                    <button className="kb-del" title="Delete card" onClick={() => deleteCard(c)}><Icon name="x" /></button>
                  </div>
                ))}
              </div>
              {addingCard === l.id ? (
                <div className="kb-add">
                  <input autoFocus className="inp sm" placeholder="Card title…" value={cardText}
                    onChange={(e) => setCardText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCard(l.id); if (e.key === "Escape") setAddingCard(null); }} />
                  <div className="kb-add-row">
                    <button className="btn dark sm" onClick={() => addCard(l.id)}>Add</button>
                    <button className="btn sm" onClick={() => { setAddingCard(null); setCardText(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="kb-addbtn" onClick={() => { setAddingCard(l.id); setCardText(""); }}><Icon name="plus" /> Add a card</button>
              )}
            </div>
          ))}

          {addingList ? (
            <div className="kb-col add">
              <input autoFocus className="inp sm" placeholder="List title…" value={listText}
                onChange={(e) => setListText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addList(); if (e.key === "Escape") setAddingList(false); }} />
              <div className="kb-add-row">
                <button className="btn dark sm" onClick={addList}>Add list</button>
                <button className="btn sm" onClick={() => { setAddingList(false); setListText(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="kb-newlist" onClick={() => setAddingList(true)}><Icon name="plus" /> Add new list</button>
          )}
        </div>
      </div>
    );
  }

  // ───── Boards list view ─────
  return (
    <div className="kb">
      <div className="kb-top">
        <div>
          <h2 style={{ margin: 0 }}>Kanboard</h2>
          <p className="sub" style={{ margin: "4px 0 0" }}>Organize your projects with intuitive boards.</p>
          <div className="kb-meta"><span className="dot ok" /> {boards.length} board{boards.length === 1 ? "" : "s"} · Team workspace</div>
        </div>
        <button className="btn dark" onClick={() => setShowCreate(true)}><Icon name="plus" /> Create Board</button>
      </div>

      {err && <div className="note">{err}</div>}

      {loading ? (
        <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
      ) : (
        <div className="kb-grid">
          {boards.map((b) => (
            <button className="kb-bcard" key={b.id} onClick={() => openBoard(b.id)}>
              <span className="kb-cover" style={{ background: cover(b.id) }}>{b.title.charAt(0).toUpperCase()}</span>
              <b className="kb-btitle">{b.title}</b>
              <div className="kb-bfoot">
                <span className="sub">{b.card_count || 0} card{b.card_count === 1 ? "" : "s"}</span>
                <span className="sub">{b.created_at ? fmtDate(b.created_at) : ""}</span>
              </div>
            </button>
          ))}
          <button className="kb-bcard new" onClick={() => setShowCreate(true)}>
            <span className="kb-plus"><Icon name="plus" /></span>
            <b>Create new board</b>
            <span className="sub">Start organizing your project</span>
          </button>
        </div>
      )}

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Board</h3>
            <div className="form-grid">
              <div className="full"><label className="lbl-f">Title</label>
                <input autoFocus className="inp" placeholder="Enter board title" value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createBoard(); }} /></div>
              <div className="full"><label className="lbl-f">Description (optional)</label>
                <textarea className="inp" rows={3} placeholder="Enter board description" value={cDesc} onChange={(e) => setCDesc(e.target.value)} /></div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn dark" onClick={createBoard} disabled={busy || !cTitle.trim()}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name="plus" />} Create Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
