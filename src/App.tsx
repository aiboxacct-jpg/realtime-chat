import {
useEffect,
useRef,
useState,
type FormEvent,
type KeyboardEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

type Message = {
  id: number;
  body: string;
  created_at: string;
  user: { id: number; username: string };
};

const SESSION_KEY = "chat-preview-session";

// Local stand-in for the space SDK's SafeAreaTopScrim: paints the notch /
// status-bar area with the page background on phones.
function SafeAreaTopScrim({ backgroundColor }: { backgroundColor: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "env(safe-area-inset-top)",
        backgroundColor,
        zIndex: 60,
        pointerEvents: "none",
      }}
    />
  );
}

function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(SESSION_KEY, token);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // The active tab still keeps the session even when storage is unavailable.
  }
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const authenticate = useMutation({
    mutationFn: () =>
      mode === "register"
        ? api.register({ username: username.trim(), password })
        : api.login({ username: username.trim(), password }),
    onSuccess: (result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      storeToken(result.token);
      onAuthenticated(result.token);
    },
    onError: () => setMessage("Couldn’t reach the room. Please try again."),
  });

  function changeMode(next: "register" | "login") {
    setMode(next);
    setMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      setMessage("Use 3–20 letters, numbers, or underscores for your username.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }
    authenticate.mutate();
  }

  return (
    <div className="auth-shell">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      <main className="auth-layout">
        <section className="auth-intro" aria-labelledby="welcome-heading">
          <div className="signal-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="room-note">One room · live conversation</p>
          <h1 id="welcome-heading">Step into the room.</h1>
          <p className="auth-lede">
            A small shared space for quick conversations. Pick a username and
            you’re in.
          </p>
          <div className="conversation-sample" aria-hidden="true">
            <div className="sample-line sample-left">Who’s around?</div>
            <div className="sample-line sample-right">Here — what’s up?</div>
          </div>
        </section>

        <section className="auth-panel" aria-label="Account access">
          <div className="mode-switch" role="tablist" aria-label="Account action">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Register
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Log in
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="your_name"
                maxLength={20}
                spellCheck={false}
              />
              {mode === "register" && (
                <p className="field-hint">Letters, numbers, and underscores.</p>
              )}
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8 characters minimum"
                maxLength={72}
              />
            </div>
            {message && (
              <p className="form-message" role="alert">
                {message}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={authenticate.isPending}>
              {authenticate.isPending
                ? "Opening room…"
                : mode === "register"
                  ? "Create account"
                  : "Enter room"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12 20 4l-4.8 16-3.6-6.4L4 12Zm7.6 1.6L20 4" />
    </svg>
  );
}

function ChatRoom({
  token,
  currentUser,
  onLogout,
}: {
  token: string;
  currentUser: { id: number; username: string };
  onLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["messages", token],
    queryFn: () => api.listMessages({ token }),
    refetchInterval: 1500,
    refetchIntervalInBackground: false,
  });

  const postMessage = useMutation({
    mutationFn: (body: string) => api.postMessage({ token, body }),
    onSuccess: (result) => {
      if (!result.ok) {
        setSendError(result.message);
        return;
      }
      setDraft("");
      setSendError(null);
      void queryClient.invalidateQueries({ queryKey: ["messages", token] });
    },
    onError: () => setSendError("Message wasn’t sent. Try again."),
  });

  const messages: Message[] =
    messagesQuery.data?.ok === true ? messagesQuery.data.messages : [];
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  function send() {
    const body = draft.trim();
    if (!body || postMessage.isPending) return;
    postMessage.mutate(body);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-shell">
      <header className="room-header">
        <div>
          <div className="live-label">
            <span className="live-dot" aria-hidden="true" />
            Live room
          </div>
          <p className="signed-in">Signed in as <strong>@{currentUser.username}</strong></p>
        </div>
        <button type="button" className="text-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <main className="message-stage" aria-label="Room messages" aria-live="polite">
        {messagesQuery.isPending ? (
          <div className="stage-state">
            <span className="loading-pulse" aria-hidden="true" />
            Joining the conversation…
          </div>
        ) : messagesQuery.data?.ok === false ? (
          <div className="stage-state error-state">
            <p>{messagesQuery.data.message}</p>
            <button type="button" onClick={onLogout}>Return to log in</button>
          </div>
        ) : messagesQuery.isError ? (
          <div className="stage-state error-state">
            <p>Couldn’t load the conversation.</p>
            <button type="button" onClick={() => messagesQuery.refetch()}>Try again</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-room">
            <div className="empty-rings" aria-hidden="true"><span /></div>
            <h1>The room is quiet.</h1>
            <p>Say hello and start the conversation.</p>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => {
              const own = message.user.id === currentUser.id;
              const previous = messages[index - 1];
              const grouped = previous?.user.id === message.user.id;
              return (
                <article
                  className={`message-row ${own ? "own" : "other"} ${grouped ? "grouped" : ""}`}
                  key={message.id}
                >
                  {!own && !grouped && (
                    <div className="avatar" aria-hidden="true">
                      {message.user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="message-content">
                    {!grouped && (
                      <div className="message-meta">
                        <strong>{own ? "You" : `@${message.user.username}`}</strong>
                        <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                      </div>
                    )}
                    <p>{message.body}</p>
                  </div>
                </article>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="composer-wrap">
        {sendError && <p className="send-error" role="alert">{sendError}</p>}
        <div className="composer">
          <label className="sr-only" htmlFor="message">Message</label>
          <textarea
            id="message"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            rows={1}
            maxLength={500}
          />
          <button
            type="button"
            className="send-button"
            aria-label="Send message"
            disabled={!draft.trim() || postMessage.isPending}
            onClick={send}
          >
            <SendIcon />
          </button>
        </div>
        <p className="composer-note">Enter to send · Shift + Enter for a new line</p>
      </footer>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const sessionQuery = useQuery({
    queryKey: ["session", token],
    queryFn: () => api.getSession({ token: token ?? "" }),
    enabled: token !== null,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: (activeToken: string) => api.logout({ token: activeToken }),
  });

  useEffect(() => {
    if (token && sessionQuery.data?.authenticated === false) {
      storeToken(null);
      setToken(null);
    }
  }, [token, sessionQuery.data]);

  function logOut() {
    if (token) logoutMutation.mutate(token);
    storeToken(null);
    setToken(null);
  }

  if (token && (sessionQuery.isPending || sessionQuery.isFetching && !sessionQuery.data)) {
    return (
      <div className="boot-screen">
        <SafeAreaTopScrim backgroundColor="var(--bg)" />
        <span className="loading-pulse" aria-hidden="true" />
        Opening the room…
      </div>
    );
  }

  if (token && sessionQuery.data?.authenticated) {
    return (
      <ChatRoom
        token={token}
        currentUser={sessionQuery.data.user}
        onLogout={logOut}
      />
    );
  }

  return <AuthScreen onAuthenticated={setToken} />;
}
