"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db, signInWithGoogle, signOutUser, useAuth } from "./firebase";

type Story = {
  id: string;
  title: string;
  author: string;
  authorUid?: string;
  category: string;
  description: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  status?: "draft" | "published";
};

const samples: Story[] = [
  { id: "sample-1", title: "窗邊的信", author: "白色羽毛", category: "短篇",
    description: "一封遲遲沒有寄出的信，究竟在等待誰來閱讀？",
    content: "有些話，並不是不知道該怎麼說。\n只是一直找不到適合寄出的地址。\n\n窗外的鴿子又來了。", createdAt: 1, status: "published" },
  { id: "sample-2", title: "無人認領的影子", author: "夜行者", category: "懸疑",
    description: "城市裡開始出現沒有主人，卻會自行移動的影子。",
    content: "那天晚上，我第一次發現自己的影子不見了。", createdAt: 2, status: "published" },
  { id: "sample-3", title: "遠方的鳥", author: "匿名", category: "奇幻",
    description: "一隻無法飛翔的鳥，與一個不願離開故鄉的人。",
    content: "牠說牠想去看看海。我說，我也一樣。", createdAt: 3, status: "published" }
];

const categories = ["全部", "短篇", "奇幻", "懸疑", "怪談", "日常"];

export default function Home() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("home");
  const [stories, setStories] = useState<Story[]>(samples);
  const [drafts, setDrafts] = useState<Story[]>([]);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState<Story | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("短篇");
  const [description, setDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!db) {
      setNotice("Firebase 尚未完成設定，暫時無法讀取雲端作品。");
      return;
    }
    const publishedQuery = query(collection(db, "stories"), where("status", "==", "published"));
    const unsubscribePublished = onSnapshot(publishedQuery, snapshot => {
      const cloudStories: Story[] = snapshot.docs.map(item => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title ?? ""),
          author: String(data.author ?? "鳩巢作者"),
          authorUid: String(data.authorUid ?? ""),
          category: String(data.category ?? "短篇"),
          description: String(data.description ?? ""),
          content: String(data.content ?? ""),
          createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
          updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : undefined,
          status: "published"
        };
      });
      cloudStories.sort((a, b) => b.createdAt - a.createdAt);
      setStories([...cloudStories, ...samples]);
    }, error => {
      console.error("Firestore published stories listener:", error);
      setNotice(error.code === "permission-denied"
        ? "目前無法讀取公開作品，請檢查 Firestore 安全規則。"
        : "讀取雲端作品時發生問題，請稍後再試。");
    });
    return unsubscribePublished;
  }, []);

  useEffect(() => {
    if (!db || !user) { setDrafts([]); return; }
    // 只用作者 UID 查詢，避免多欄位查詢需要額外索引；
    // 再於前端篩選草稿，且查詢範圍只包含目前登入者自己的作品。
    const draftsQuery = query(
      collection(db, "stories"),
      where("authorUid", "==", user.uid)
    );
    const unsubscribeDrafts = onSnapshot(draftsQuery, snapshot => {
      const ownDrafts: Story[] = snapshot.docs.filter(item => item.data().status === "draft").map(item => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title ?? ""),
          author: String(data.author ?? user.displayName ?? "鳩巢作者"),
          authorUid: String(data.authorUid ?? ""),
          category: String(data.category ?? "短篇"),
          description: String(data.description ?? ""),
          content: String(data.content ?? ""),
          createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
          updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
          status: "draft"
        };
      });
      ownDrafts.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setDrafts(ownDrafts);
    }, error => {
      console.error("Firestore drafts listener:", error);
      setNotice(error.code === "permission-denied"
        ? "無法讀取私人草稿，請檢查 Firestore 安全規則。"
        : "讀取草稿時發生問題，請稍後再試。");
    });
    return unsubscribeDrafts;
  }, [user]);

  const filtered = useMemo(() => stories.filter(s =>
    (category === "全部" || s.category === category) &&
    (s.title + " " + s.author + " " + s.category + " " + s.description).toLowerCase().includes(queryText.toLowerCase())
  ), [stories, category, queryText]);

  function clearEditor() {
    setTitle("");
    setKind("短篇");
    setDescription("");
    setContentText("");
    setEditingId(null);
  }

  function editDraft(story: Story) {
    setTitle(story.title);
    setKind(story.category);
    setDescription(story.description);
    setContentText(story.content);
    setEditingId(story.id);
    setPage("write");
    setNotice("已載入草稿，可以繼續編輯。");
  }

  async function saveDraft() {
    if (!user) { setNotice("請先登入，才能保存私人草稿。"); return; }
    if (!title.trim() && !contentText.trim() && !description.trim()) {
      setNotice("先寫下一點內容，再保存草稿吧。");
      return;
    }
    if (!db) { setNotice("資料庫尚未連線，暫時無法保存草稿。"); return; }
    setNotice("正在保存私人草稿…");
    const now = Date.now();
    const data = {
      title: title.trim() || "未命名草稿",
      author: user.displayName || "鳩巢作者",
      authorUid: user.uid,
      category: kind,
      description: description.trim(),
      content: contentText,
      updatedAt: now,
      status: "draft"
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "stories", editingId), data);
      } else {
        const created = await addDoc(collection(db, "stories"), { ...data, createdAt: now });
        setEditingId(created.id);
      }
      setNotice("草稿已保存！只有你自己看得到。");
    } catch (error) {
      console.error("Firestore save draft:", error);
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      setNotice(code === "permission-denied"
        ? "草稿保存被拒絕：請先更新 Firestore 安全規則。"
        : "草稿保存失敗，請稍後再試；編輯欄位內容仍保留。");
    }
  }

  async function publish() {
    if (!user) { setNotice("請先使用 Google 帳號登入，再發布作品。"); return; }
    if (!title.trim() || !contentText.trim()) { setNotice("請填寫作品名稱與正文。"); return; }
    if (!db) { setNotice("資料庫尚未連線，暫時無法發布作品。"); return; }

    setNotice("正在將作品發布到鳩巢…");
    const now = Date.now();
    const data = {
      title: title.trim(),
      author: user.displayName || "鳩巢作者",
      authorUid: user.uid,
      category: kind,
      description: description.trim() || "作者尚未填寫簡介。",
      content: contentText.trim(),
      updatedAt: now,
      status: "published"
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "stories", editingId), data);
      } else {
        await addDoc(collection(db, "stories"), { ...data, createdAt: now });
      }
      clearEditor();
      setNotice("發布成功！作品已保存到鳩巢資料庫。");
      setPage("read");
    } catch (error) {
      console.error("Firestore publish:", error);
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      setNotice(code === "permission-denied"
        ? "作品尚未保存：請檢查 Firestore 安全規則。"
        : "發布失敗，請稍後再試。作品內容仍保留在編輯欄位中。");
    }
  }

  async function deleteDraft(story: Story) {
    if (!db || !user || story.authorUid !== user.uid) return;
    if (!window.confirm("確定要刪除這份草稿嗎？刪除後無法復原。")) return;
    try {
      await deleteDoc(doc(db, "stories", story.id));
      if (editingId === story.id) clearEditor();
      setNotice("草稿已刪除。");
    } catch (error) {
      console.error("Firestore delete draft:", error);
      setNotice("刪除草稿失敗，請稍後再試。");
    }
  }

  async function login() {
    try { await signInWithGoogle(); setNotice("登入成功。"); }
    catch (e) { setNotice(e instanceof Error ? e.message : "登入未完成，請確認 Firebase 設定。"); }
  }

  async function logout() {
    try { await signOutUser(); setNotice("已登出。"); }
    catch { setNotice("登出時發生問題，請再試一次。"); }
  }

  return <main className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setPage("home"); setSelected(null); }}>
        <span className="brand-bird">🕊</span><span><b>鳩巢</b><small>DOVENEST</small></span>
      </button>
      <nav>
        {["home", "read", "write", "authors"].map((p, i) =>
          <button key={p} className={page === p ? "nav-active" : ""} onClick={() => { setPage(p); setSelected(null); }}>
            {["首頁", "閱讀", "創作", "我的作品"][i]}
          </button>)}
      </nav>
      <div className="account">
        {loading ? <span className="muted">載入中…</span> : user ?
          <><span className="user-name">{user.displayName || "已登入"}</span><button className="small-outline" onClick={logout}>登出</button></> :
          <button className="small-outline" onClick={login}>Google 登入</button>}
      </div>
    </header>

    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}

    {selected ? <section className="reader">
      <button className="back-link" onClick={() => setSelected(null)}>← 返回書架</button>
      <div className="book-cover"><span>🕊</span><b>{selected.title}</b><small>{selected.category}</small></div>
      <h1>{selected.title}</h1><p className="muted">作者：{selected.author}</p>
      <p className="description">{selected.description}</p>
      <article className="story-body">{selected.content}</article>
    </section> : <>
      {page === "home" && <section>
        <div className="hero">
          <div><p className="eyebrow">A HOME FOR EVERY STORY</p><h1>讓故事，<br/>有個棲身之處。</h1>
            <p className="hero-copy">每一個故事，都有自己的方向。<br/>在這裡閱讀、書寫，讓文字飛向更遠的地方。</p>
            <div className="actions"><button className="primary" onClick={() => setPage("read")}>開始閱讀　→</button><button className="secondary" onClick={() => setPage("write")}>開始創作</button></div>
          </div>
          <div className="hero-art"><div className="hero-frame"><span>🕊</span><p>飛向文字的彼方</p><small>DOVE · LETTER · STORY</small></div></div>
        </div>
        <div className="section-heading"><div><p className="eyebrow">DISCOVER</p><h2>故事選集</h2></div><button className="text-link" onClick={() => setPage("read")}>全部作品 →</button></div>
        <div className="story-grid">{stories.slice(0, 3).map(s => <StoryCard key={s.id} story={s} onOpen={setSelected}/>)}</div>
        <div className="invitation"><span>🪶</span><h2>每個人都可以是作者。</h2><p>不需要等待被看見，先寫下屬於自己的故事。</p><button className="primary" onClick={() => setPage("write")}>寫下第一個故事</button></div>
      </section>}

      {page === "read" && <section className="page-section">
        <p className="eyebrow">LIBRARY</p><h1>閱讀書架</h1><p className="muted">在眾多故事裡，找到你想停留的地方。</p>
        <input className="search" value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="搜尋作品名稱、作者或分類…"/>
        <div className="category-row">{categories.map(c => <button key={c} className={category === c ? "chip selected" : "chip"} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className="story-grid">{filtered.map(s => <StoryCard key={s.id} story={s} onOpen={setSelected}/>)}</div>
        {!filtered.length && <p className="empty">沒有找到符合條件的作品。</p>}
      </section>}

      {page === "write" && <section className="page-section">
        <p className="eyebrow">YOUR DESK</p><h1>創作工作室</h1><p className="muted">把腦海中的世界寫下來。草稿只有你自己看得到。</p>
        {!user && <div className="callout">請先使用 Google 帳號登入，才能保存私人草稿或發布作品。<button className="text-link" onClick={login}>立即登入 →</button></div>}
        <div className="editor">
          <label>作品名稱<input value={title} onChange={e => setTitle(e.target.value)} placeholder="為你的故事取一個名字"/></label>
          <label>作品分類<select value={kind} onChange={e => setKind(e.target.value)}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
          <label>故事簡介<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="簡單介紹你的故事…"/></label>
          <label>正文內容<textarea rows={13} value={contentText} onChange={e => setContentText(e.target.value)} placeholder="從這裡開始，寫下你的故事…"/></label>
          <div className="editor-bottom"><span>{editingId ? "正在編輯已保存的草稿。" : "尚未保存的內容只在目前頁面中。記得保存草稿！"}</span><div className="editor-actions"><button className="secondary" onClick={saveDraft}>保存草稿</button><button className="primary" onClick={publish}>正式發布</button></div></div>
        </div>
      </section>}

      {page === "authors" && <section className="page-section">
        <p className="eyebrow">MY WRITING</p><h1>我的作品</h1><p className="muted">管理你的草稿，準備好時再讓故事公開。</p>
        {!user ? <div className="callout">登入後才能查看自己的私人草稿。<button className="text-link" onClick={login}>立即登入 →</button></div> : <>
          <div className="section-heading"><div><p className="eyebrow">PRIVATE</p><h2>私人草稿</h2></div><button className="text-link" onClick={() => { clearEditor(); setPage("write"); }}>新增作品 ＋</button></div>
          {!drafts.length ? <p className="empty">目前沒有草稿。想寫的故事，可以先放在這裡。</p> :
            <div className="draft-list">{drafts.map(d => <div className="draft-item" key={d.id}><div className="draft-info"><b>{d.title}</b><small>{d.category} · 最近保存：{d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "剛剛"}</small><p>{d.description || "尚未填寫簡介"}</p></div><div className="draft-actions"><button className="small-outline" onClick={() => editDraft(d)}>繼續編輯</button><button className="small-outline" onClick={() => deleteDraft(d)}>刪除</button></div></div>)}
            </div>}
        </>}
      </section>}
    </>}
    <footer><div>🕊</div><b>鳩 巢</b><small>DOVENEST · A HOME FOR STORIES</small><p>讓每一個故事，都能找到自己的歸處。</p></footer>
  </main>;
}

function StoryCard({ story, onOpen }: { story: Story; onOpen: (s: Story) => void }) {
  return <button className="story-card" onClick={() => onOpen(story)}>
    <div className="cover"><span>🕊</span><b>{story.title}</b><small>{story.category}</small></div>
    <span className="category-label">{story.category}</span><h3>{story.title}</h3><p>{story.description}</p><small className="muted">作者：{story.author}</small>
  </button>;
}
