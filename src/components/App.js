import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // Hook para manejar Auth0
import { auth, db } from '../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

function App() {
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const loadMessages = async () => {
      const querySnapshot = await getDocs(collection(db, 'messages'));
      setMessages(querySnapshot.docs.map(doc => doc.data().message));
    };
    loadMessages();
    
    // Verifica si el usuario es admin (cambia el correo según corresponda)
    if (user?.email === 'admin@tuapp.com') {
      setIsAdmin(true);
    }
  }, [user]);

  // Verificar si el usuario ha alcanzado el límite de mensajes
  const canSendMessage = async (userId) => {
    const messagesRef = collection(db, 'messages');
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const q = query(
      messagesRef,
      where('userId', '==', userId),
      where('timestamp', '>', oneDayAgo)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size < 2;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !isAuthenticated) return;

    try {
      const isAllowed = await canSendMessage(user.sub); // Usar el UID de Auth0 (user.sub)
      if (!isAllowed) {
        alert('Has alcanzado el límite de 2 mensajes en 24 horas.');
        return;
      }

      await addDoc(collection(db, 'messages'), {
        message: newMessage,
        userId: user.sub, // Guardar el UID de Auth0
        timestamp: serverTimestamp(),
      });

      setMessages([...messages, newMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Error al guardar el mensaje:', error.message);
    }
  };

  return (
    <div className="App">
      <h1>Mensajes Anónimos</h1>

      {!isAuthenticated && (
        <button onClick={() => loginWithRedirect()}>Iniciar sesión</button>
      )}

      {isAuthenticated && (
        <div>
          {!isAdmin && (
            <form onSubmit={handleSubmit}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe tu mensaje anónimo..."
                rows="4"
                cols="50"
              />
              <br />
              <button type="submit">Enviar Mensaje</button>
            </form>
          )}

          {isAdmin && (
            <div>
              <h2>Mensajes:</h2>
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index} className="message">
                    {msg}
                  </div>
                ))
              ) : (
                <p>No hay mensajes aún.</p>
              )}
            </div>
          )}

          <button onClick={() => logout()}>Cerrar Sesión</button>
        </div>
      )}
    </div>
  );
}

export default App;

// firebase deploy --only firestore:rules 