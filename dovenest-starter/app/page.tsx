 "use client";

import { useMemo, useState } from "react";
import { signInWithGoogle, signOutUser, useAuth } from "./firebase";

type Story = {
  id: string; title: string; author: string; category: string;
  description: string; content: string; createdAt: number;
};

const samples: Story[] = [
  { id: "sample-1", title: "窗邊的信", author: "白色羽毛", category: "短篇",
    description: "一封遲遲沒有寄出的信，究竟在等待誰來閱讀？",
    content: "有些話，並不是不知道該怎麼說。\\n只是一直找不到適合寄出的地址。\\n\\n窗外的鴿子又來了。", createdAt: 1 },
  { id: "sample-2", title: "無人認領的影子", author: "夜行者", category: "懸疑",
    description: "城市裡開始出現沒有主人，卻會自行移動的影子。",
    content: "那天晚上，我第一次發現自己的影子不見了。", createdAt: 2 },
  { id: "sample-3", title: "遠方的鳥", author: "匿名", category: "奇幻",
    description: "一隻無法飛翔的鳥，與一個不願離開故鄉的人。",
    content: "牠說牠想去看看海。我說，我也一樣。", createdAt: 3 }
];

const categories = ["全部", "短篇", "奇幻", "懸疑", "怪談", "日常"];

export default function Home() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("home");
  const [stories, setStories] = useState<Story[]>(samples);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState<Story | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("短篇");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => stories.filter(s =>
    (category === "全部" || s.category === category) &&
    `${s.title} ${s.author} ${s.category} ${s.description}`.toLowerCase().includes(query.toLowerCase())
  ), [stories, category, query]);

  function publish() {
    if (!user) { setNotice("請先使用 Google 帳號登入，再發布作品。"); return; }
    if (!title.trim() || !content.trim()) { setNotice("請填寫作品名稱與正文。"); return; }
    const story: Story = {
      id: crypto.randomUUID(), title: title.trim(), author: user.displayName || "鳩巢作者",
      category: kind, description: description.trim() || "作者尚未填寫簡介。",
      content, createdAt: Date.now()
    };
    setStories(prev => [story, ...prev]);
    setTitle(""); setDescription(""); setContent(""); setNotice("作品已加入目前頁面。正式版資料庫尚待設定。");
    setPage("read");
  }

  async function login() {
    try { await signInWithGoogle(); setNotice("登入成功。"); }
    catch (e) { setNotice(e instanceof Error ? e.message : "登入未完成，請確認 Firebase 設定。"); }
  }

  return <main className="site-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setPage("home"); setSelected(null); }}>
        <span className="brand-bird">🕊</span><span><b>鳩巢</b><small>DOVENEST</small></span>
      </button>
      <nav>
        {["home", "read", "write", "authors"].map((p, i) =>
          <button key={p} className={page === p ? "nav-active" : ""} onClick={() => { setPage(p); setSelected(null); }}>
            {["首頁", "閱讀", "創作", "作者"][i]}
          </button>)}
      </nav>
      <div className="account">
        {loading ? <span className="muted">載入中…</span> : user ?
          <><span className="user-name">{user.displayName || user.email}</span><button className="small-outline" onClick={() => signOutUser()}>登出</button></> :
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
        <input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋作品名稱、作者或分類…"/>
        <div className="category-row">{categories.map(c => <button key={c} className={category === c ? "chip selected" : "chip"} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className="story-grid">{filtered.map(s => <StoryCard key={s.id} story={s} onOpen={setSelected}/>)}</div>
        {!filtered.length && <p className="empty">沒有找到符合條件的作品。</p>}
      </section>}

      {page === "write" && <section className="page-section">
        <p className="eyebrow">YOUR DESK</p><h1>創作工作室</h1><p className="muted">把腦海中的世界寫下來。每一個故事，都值得被好好保存。</p>
        {!user && <div className="callout">發布作品前，請先使用 Google 帳號登入。<button className="text-link" onClick={login}>立即登入 →</button></div>}
        <div className="editor">
          <label>作品名稱<input value={title} onChange={e => setTitle(e.target.value)} placeholder="為你的故事取一個名字"/></label>
          <label>作品分類<select value={kind} onChange={e => setKind(e.target.value)}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
          <label>故事簡介<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="簡單介紹你的故事…"/></label>
          <label>正文內容<textarea rows={13} value={content} onChange={e => setContent(e.target.value)} placeholder="從這裡開始，寫下你的故事…"/></label>
          <div className="editor-bottom"><span>正式版將加入草稿儲存與章節管理。</span><button className="primary" onClick={publish}>發布作品</button></div>
        </div>
      </section>}

      {page === "authors" && <section className="page-section">
        <p className="eyebrow">OUR WRITERS</p><h1>創作者</h1><p className="muted">每一位作者，都擁有獨一無二的世界。</p>
        <div className="author-panel"><div className="avatar">🕊</div><div><h2>{user?.displayName || "鳩巢的訪客"}</h2><p>{user ? user.email : "尚未登入 · 歡迎成為第一位作者"}</p></div></div>
        <div className="invitation"><span>✉</span><h2>加入創作者行列</h2><p>建立自己的個人頁面，發布作品，讓讀者找到你的故事。</p><button className="primary" onClick={user ? () => setPage("write") : login}>{user ? "開始創作" : "註冊 / 登入"}</button></div>
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
