import React, { useState } from 'react';
import { ReactMediaRecorder } from 'react-media-recorder';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function App() {
  const [aiResponse, setAiResponse] = useState(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationFinished, setConversationFinished] = useState(false);
  const [summaryFileUrl, setSummaryFileUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [password, setPassword] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // State for selected language

  const { transcript, listening, resetTranscript } = useSpeechRecognition({
    language: selectedLanguage, // Pass the selected language to SpeechRecognition
  });

  const playAudio = (audioUrl) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.play().then(resolve).catch(reject);
      audio.onended = resolve;
    });
  };

  const startConversation = async () => {
    try {
      const sessionResponse = await axios.post('https://beasy.ai/api/start_session', {
        password: password,
        language: selectedLanguage, // Send selected language to the back-end
      });
      const { session_id } = sessionResponse.data;
      setSessionId(session_id);

      const response = await axios.get('https://beasy.ai/api/initial_question', {
        params: { session_id },
      });
      const { question, speech_file_url } = response.data;
      setAiResponse(question);
      setConversationStarted(true);

      if (speech_file_url) {
        await playAudio(`https://beasy.ai${speech_file_url}`);
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
    formData.append('language', selectedLanguage); // Send language to the server

    try {
      const response = await axios.post('https://beasy.ai/api/conversation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { transcribed_text, gpt_response, speech_file_url } = response.data;

      setAiResponse(gpt_response);

      if (speech_file_url) {
        console.log('Playing response audio:', speech_file_url);
        await playAudio(`https://beasy.ai${speech_file_url}`);
      } else {
        console.error('No valid speech file URL returned from server');
      }
    } catch (error) {
      console.error('Error sending audio to the server:', error);
    }
  };

  const stopConversation = async () => {
    try {
      const response = await axios.post('https://beasy.ai/api/stop_conversation', {
        session_id: sessionId,
        language: selectedLanguage, // Send language to the back-end
      });
      const { summary_file } = response.data;

      setConversationFinished(true);
      setSummaryFileUrl(`https://beasy.ai${summary_file}`);

      console.log("Conversation stopped and summary generated:", summary_file);
    } catch (error) {
      console.error('Error stopping the conversation:', error);
    }
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
      <h1>AI Conversation</h1>
      
      {/* Language selection */}
      <div>
        <label htmlFor="language-select">Choose language:</label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="en-US">English</option>
          <option value="nl-NL">Dutch</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          {/* Add more languages as needed */}
        </select>
      </div>

      {!conversationStarted && (
        <div>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              <button
                onClick={() => {
                  if (!isRecording) {
                    resetTranscript();
                    SpeechRecognition.startListening({ continuous: true, language: selectedLanguage });
                    startRecording();
                  } else {
                    SpeechRecognition.stopListening();
                    stopRecording();
                    if (mediaBlobUrl) {
                      fetch(mediaBlobUrl)
                        .then((res) => res.blob())
                        .then((blob) => handleSendAudio(blob));
                    }
                  }
                  setIsRecording(!isRecording);
                }}
              >
                {isRecording ? 'Stop & Send Audio' : 'Start Talking'}
              </button>

              {/* Display transcript */}
              <p>{transcript}</p>

              {mediaBlobUrl && <audio src={mediaBlobUrl} controls />}
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
