import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import DealList from './components/DealList'
import DealDetail from './components/DealDetail'
import ChatList from './components/ChatList'
import ChatDetail from './components/ChatDetail'
import Users from './components/Users'
import ConversationList from './components/ConversationList'
import ConversationDetail from './components/ConversationDetail'
import AudioList from './components/AudioList'
import EmailList from './components/EmailList'
import EmailDetailPage from './components/EmailDetailPage'
import './App.css'

function App(): JSX.Element {
    return (
        <Router>
            <div className="app">
                <nav className="app-nav">
                    <div className="nav-container">
                        <Link to="/" className="nav-logo">
                            ATS Deal Recap
                        </Link>
                        <div className="nav-links">
                            <Link to="/" className="nav-link">Home</Link>
                            <Link to="/deals" className="nav-link">Deals</Link>
                            <Link to="/chats" className="nav-link">Chats</Link>
                            <Link to="/audios" className="nav-link">Audios</Link>
                            <Link to="/emails" className="nav-link">Emails</Link>
                            <Link to="/users" className="nav-link">Users</Link>
                        </div>
                    </div>
                </nav>

                <main className="app-main">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/deals" element={<DealList />} />
                        <Route path="/deal" element={<DealDetail />} />
                        <Route path="/chats" element={<ChatList />} />
                        <Route path="/chat" element={<ChatDetail />} />
                        <Route path="/conversations" element={<ConversationList />} />
                        <Route path="/conversation" element={<ConversationDetail />} />
                        <Route path="/audios" element={<AudioList />} />
                        <Route path="/emails" element={<EmailList />} />
                        <Route path="/email" element={<EmailDetailPage />} />
                        <Route path="/users" element={<Users />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

const HomePage: React.FC = () => {
    return (
        <div className="home-page">
            <header className="app-header">
                <h1>Welcome to ATC Deal Recap</h1>
                <p>Your simple React TypeScript application is ready</p>
            </header>
        </div>
    );
};

export default App