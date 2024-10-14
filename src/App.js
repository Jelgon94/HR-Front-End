import React, { useState } from 'react';
import { ReactMediaRecorder } from 'react-media-recorder';
import axios from 'axios';

function App() {
  const [aiResponse, setAiResponse] = useState(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationFinished, setConversationFinished] = useState(false);
  const [summaryFileUrl, setSummaryFileUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [password, setPassword] = useState(''); // State for password input

  // Function to play an audio file given its URL
  const playAudio = (audioUrl) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.play().then(resolve).catch(reject);
      audio.onended = resolve;
    });
  };

  const startConversation = async () => {
    try {
      // Start a new session
      const sessionResponse = await axios.post('http://localhost:5000/api/start_session', {
        password: password, // Use the password from the input
      });
      const { session_id } = sessionResponse.data;
      setSessionId(session_id);

      // Get the initial question
      const response = await axios.get('http://localhost:5000/api/initial_question', {
        params: { session_id },
      });
      const { question, speech_file_url } = response.data;
      setAiResponse(question);
      setConversationStarted(true);

      // Play the initial question's audio
      if (speech_file_url) {
        await playAudio(`http://localhost:5000${speech_file_url}`);
      } else {
        console.error('No valid speech file URL returned from server');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    if (!sessionId) {
      console.error('Session ID is not set');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('session_id', sessionId);

    try {
      const response = await axios.post('http://localhost:5000/api/conversation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { transcribed_text, gpt_response, speech_file_url } = response.data;

      // Save the transcribed text and AI response in state or a summary
      console.log("Transcribed Text:", transcribed_text);
      console.log("GPT Response:", gpt_response);

      // Update AI response state
      setAiResponse(gpt_response);

      // Play the generated response
      if (speech_file_url) {
        console.log('Playing response audio:', speech_file_url);
        await playAudio(`http://localhost:5000${speech_file_url}`);
      } else {
        console.error('No valid speech file URL returned from server');
      }
    } catch (error) {
      console.error('Error sending audio to the server:', error);
    }
  };

  const stopConversation = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/stop_conversation', {
        session_id: sessionId,
      });
      const { summary_file } = response.data;

      setConversationFinished(true);
      setSummaryFileUrl(`http://localhost:5000${summary_file}`);

      console.log("Conversation stopped and summary generated:", summary_file);
    } catch (error) {
      console.error('Error stopping the conversation:', error);
    }
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
      <h1>AI Conversation</h1>
      {!conversationStarted && (
        <div>
          <input
            type="password"
            placeholder="Voer wachtwoord in"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // Update password state
            style={{ marginBottom: '10px' }}
          />
          <button onClick={startConversation}>Start Conversation</button>
        </div>
      )}
      {conversationStarted && aiResponse && (
        <div>
          <h3>AI Question:</h3>
          <p>{aiResponse}</p>
        </div>
      )}
      {!conversationFinished && conversationStarted && (
        <ReactMediaRecorder
          audio
          render={({ startRecording, stopRecording, mediaBlobUrl }) => (
            <div>
              <button onClick={startRecording}>Start Talking</button>
              <button onClick={stopRecording}>Stop & Send Audio</button>
              {mediaBlobUrl && (
                <>
                  <audio src={mediaBlobUrl} controls />
                  <button
                    onClick={() => {
                      fetch(mediaBlobUrl)
                        .then((res) => res.blob())
                        .then((blob) => handleSendAudio(blob));
                    }}
                  >
                    Send to AI
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}
      {conversationStarted && !conversationFinished && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={stopConversation}>Stop Conversation</button>
        </div>
      )}
      {conversationFinished && (
        <div>
          <h3>Conversation finished</h3>
          {summaryFileUrl && (
            <div>
              <p>Summary generated: <a href={summaryFileUrl} download>Download Summary</a></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
