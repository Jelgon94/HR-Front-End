import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Button, Text, IconButton, VStack, HStack, Flex, Checkbox, Select } from '@chakra-ui/react';
import { FaMicrophone, FaVideo } from 'react-icons/fa';
import { ReactMediaRecorder } from 'react-media-recorder';
import axios from 'axios';

function App() {
  const [step, setStep] = useState(0); // Tracks the current step in the UI
  const [sessionId, setSessionId] = useState(''); // Session ID for the interview
  const [password, setPassword] = useState(''); // Password for creating a new session
  const [language, setLanguage] = useState('EN'); // Language selection
  const [cameraOn, setCameraOn] = useState(false); // Toggles camera state
  const [microphoneOn, setMicrophoneOn] = useState(false); // Toggles microphone state
  const [conversationStarted, setConversationStarted] = useState(false); // Tracks if the conversation has started
  const [aiResponse, setAiResponse] = useState(null); // Stores AI's question/response
  const [agreedToTerms, setAgreedToTerms] = useState(false); // Terms acceptance
  const [sessionIdValid, setSessionIdValid] = useState(false); // Validates session ID
  const [sessionIdError, setSessionIdError] = useState(''); // Stores session validation error
  const [isProcessing, setIsProcessing] = useState(false); // Processing state for audio send
  const [conversationFinished, setConversationFinished] = useState(false); // Tracks if conversation is finished
  const [summaryFileUrl, setSummaryFileUrl] = useState(''); // URL of the conversation summary
  const [cameraStream, setCameraStream] = useState(null); // Camera stream state
  const [videoDevices, setVideoDevices] = useState([]); // List of video input devices
  const [audioDevices, setAudioDevices] = useState([]); // List of audio input devices
  const [isRecording, setIsRecording] = useState(false); // Tracks if recording is active
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); // Tracks if AI's audio response is playing
  const [selectedVideoDevice, setSelectedVideoDevice] = useState(null); // Selected video input device
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null); // Selected audio input device
  const [microphoneStream, setMicrophoneStream] = useState(null);

  // Creates a new session by calling the backend
  const createSession = async () => {
    try {
      const sessionResponse = await axios.post('https://beasy.ai/api/start_session', {
        password: password,
      });
      const { session_id } = sessionResponse.data;
      if (session_id) {
        setSessionId(session_id);
      } else {
        console.error("Failed to create session, no session ID returned.");
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Validates the session ID entered by the user
  const validateSessionId = async () => {
    try {
      const response = await axios.get('https://beasy.ai/api/validate_session', {
        params: { session_id: sessionId }
      });
      if (response.data.valid) {
        setSessionIdValid(true);
        setSessionIdError('');
        setStep(1); // Move to the next step
      } else {
        setSessionIdError('Sessie-ID niet gevonden in de database.');
        setSessionIdValid(false);
      }
    } catch (error) {
      console.error('Error validating session:', error);
      setSessionIdError('Fout bij het valideren van de sessie.');
    }
  };

  // Starts the conversation with the AI, fetching the first question
  const startConversation = async () => {
    try {
      if (!sessionId) {
        console.error("Session ID is required to start conversation");
        return;
      }
      const response = await axios.get('https://beasy.ai/api/initial_question', { params: { session_id: sessionId } });
      const { question, speech_file_url } = response.data;
      setAiResponse(question);
      setConversationStarted(true);

      if (speech_file_url) {
        await playAudio(`https://beasy.ai${speech_file_url}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Stops the conversation and fetches the summary
  const stopConversation = async () => {
    try {
      const response = await axios.post('https://beasy.ai/api/stop_conversation', {
        session_id: sessionId,
      });
      const { summary_file } = response.data;

      setConversationFinished(true);
      setSummaryFileUrl(`https://beasy.ai/${summary_file}`);
    } catch (error) {
      console.error('Error stopping the conversation:', error);
    }
  };

  // Sends the recorded audio to the backend for transcription and AI response
  const handleSendAudio = async (audioBlob) => {
    if (!sessionId) {
      console.error('Session ID is not set');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('session_id', sessionId);

    try {
      setIsProcessing(true);
      const response = await axios.post('https://beasy.ai/api/conversation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { transcribed_text, gpt_response, speech_file_url } = response.data;
      setAiResponse(gpt_response);

      if (speech_file_url) {
        await playAudio(`https://beasy.ai${speech_file_url}`);
      }
    } catch (error) {
      console.error('Error sending audio to the server:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Plays the AI's audio response
  const playAudio = (audioUrl) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      setIsPlayingAudio(true);
      audio.play().then(resolve).catch(reject);
      audio.onended = () => {
        setIsPlayingAudio(false);
        resolve();
      };
    });
  };

// Verzoek om toegang tot media-apparaten
const requestMediaDevices = () => {
  navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
      const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      setVideoDevices(videoInputDevices);
      setAudioDevices(audioInputDevices);
    })
    .catch((err) => console.error('Error accessing media devices:', err));
};

useEffect(() => {
  if (step === 2) {
    requestMediaDevices();
  }
}, [step]);

// Camera toggle functie
const toggleCamera = (deviceId = selectedVideoDevice) => {
  if (cameraOn && cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop()); // Stoppen van huidige camera stream
    setCameraStream(null);
  } else {
    navigator.mediaDevices.getUserMedia({ video: { deviceId } })
      .then((stream) => {
        setCameraStream(stream);
        setSelectedVideoDevice(deviceId);
      })
      .catch((err) => console.error('Error starting camera:', err));
  }
  setCameraOn(!cameraOn);
};

// Microfoon toggle functie
const toggleMicrophone = (deviceId = selectedAudioDevice) => {
  if (microphoneOn && microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop()); // Stoppen van huidige microfoon stream
    setMicrophoneStream(null);
  } else {
    navigator.mediaDevices.getUserMedia({ audio: { deviceId } })
      .then((stream) => {
        setMicrophoneStream(stream);
        setSelectedAudioDevice(deviceId);
      })
      .catch((err) => console.error('Error starting microphone:', err));
  }
  setMicrophoneOn(!microphoneOn);
};

  // Step 0: Session ID entry
  const renderSessionIdStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg" color="white">Voer uw sessie-ID in om verder te gaan:</Text>
      <input
        type="text"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        placeholder="Sessie-ID"
        style={{ padding: '10px', fontSize: '16px', backgroundColor: 'black', color: 'white' }}
      />
      <Text fontSize="lg" color="white">Of voer het master wachtwoord in voor een nieuwe sessie aan te maken:</Text>
      <input
        type="password"
        placeholder="Voer wachtwoord in"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: '10px', fontSize: '16px', backgroundColor: 'black', color: 'white' }}
      />
      <Button colorScheme="blue" onClick={createSession} isDisabled={!password}>
        Maak Sessie aan
      </Button>

      {sessionId && sessionIdValid && (
        <Text color="green.400">Sessie succesvol aangemaakt! Sessie-ID: {sessionId}</Text>
      )}
      {sessionIdError && <Text color="red.400">{sessionIdError}</Text>}

      <Button colorScheme="blue" onClick={validateSessionId} isDisabled={!sessionId}>
        Volgende
      </Button>
    </VStack>
  );

  // Step 1: Language selection and terms agreement
  const renderLanguageSelectionStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg" color="white">Selecteer uw voorkeurstaal:</Text>
      <Select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        placeholder="Selecteer Taal"
        style={{ padding: '10px', fontSize: '16px', backgroundColor: 'black', color: 'white' }}
      >
        <option value="EN">Engels</option>
        <option value="NL">Nederlands</option>
        <option value="FR">Frans</option>
      </Select>

      <Checkbox
        isChecked={agreedToTerms}
        color={'white'}
        onChange={(e) => setAgreedToTerms(e.target.checked)}
        colorScheme="blue"
      >
        Ik ga akkoord met de voorwaarden
      </Checkbox>

      <Button colorScheme="blue" onClick={() => setStep(2)} isDisabled={!agreedToTerms || !language}>
        Volgende
      </Button>
    </VStack>
  );

  // Step 2: Microphone and camera settings
  const renderMediaSettingsStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg" color="white">Stel uw microfoon en camera in:</Text>

      <Text color="white">Selecteer uw audio-apparaat:</Text>
      <Select
        placeholder="Kies audio-ingang"
        value={selectedAudioDevice}
        onChange={(e) => toggleMicrophone(e.target.value)}
        style={{ padding: '10px', fontSize: '16px', backgroundColor: 'black', color: 'white' }}
      >
        {audioDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
        ))}
      </Select>

      <Text color="white">Selecteer uw video-apparaat:</Text>
      <Select
        placeholder="Kies video-ingang"
        value={selectedVideoDevice}
        onChange={(e) => toggleCamera(e.target.value)}
        style={{ padding: '10px', fontSize: '16px', backgroundColor: 'black', color: 'white' }}
      >
        {videoDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
        ))}
      </Select>

      {cameraOn && cameraStream && (
        <Box borderRadius="md" overflow="hidden">
          <video
            style={{ maxWidth: '100%', maxHeight: '300px' }}
            ref={(videoElement) => {
              if (videoElement) {
                videoElement.srcObject = cameraStream;
              }
            }}
            autoPlay
            playsInline
          />
        </Box>
      )}

      <HStack spacing={4}>
        <Button
          colorScheme={cameraOn ? 'green' : 'red'}
          onClick={() => toggleCamera(selectedVideoDevice)}
        >
          {cameraOn ? 'Zet camera uit' : 'Zet camera aan'}
        </Button>
        <Button
          colorScheme={microphoneOn ? 'green' : 'red'}
          onClick={() => toggleMicrophone(selectedAudioDevice)}
        >{microphoneOn ? 'Zet microfoon uit' : 'Zet microfoon aan'}
        </Button>
      </HStack>
      <HStack>
        <Button colorScheme="gray" onClick={() => setStep(step - 1)}>Terug</Button>
        <Button colorScheme="blue" onClick={() => setStep(3)} disabled={!cameraOn && !microphoneOn}>
          Start Interview
        </Button>
      </HStack>
    </VStack>
  );
  // Step 3: Conversation view
  const renderConversationStep = () => (
    <VStack spacing={4}>
      {cameraOn && (
        <Box borderRadius="md" overflow="hidden">
          <video
            style={{ maxWidth: '100%', maxHeight: '200px' }}
            autoPlay
            playsInline
            ref={(videoElement) => {
              if (videoElement && cameraStream) {
                videoElement.srcObject = cameraStream;
              }
            }}
          />
        </Box>
      )}
      <Text fontSize="lg" color="white">AI Interview</Text>

      {aiResponse ? (
        <Box p={4} borderWidth="1px" borderRadius="md">
          <Text fontSize="md" color="white">{aiResponse}</Text>
        </Box>
      ) : (
        <Text fontSize="md" color="white">Wacht op de AI...</Text>
      )}

      <ReactMediaRecorder
        audio
        onStop={async (blobUrl, blob) => {
          if (!blob) return;
          setIsRecording(false);
          await handleSendAudio(blob);
        }}
        render={({ startRecording, stopRecording, mediaBlobUrl }) => (
          <Button
            colorScheme={isRecording ? "red" : "green"}
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
                setIsRecording(true);
              }
            }}
            isDisabled={isProcessing || isPlayingAudio}
          >
            {isRecording ? 'Stop opnamen' : 'Start opnamen'}
          </Button>
        )}
      />

      {conversationStarted ? (
        <Button colorScheme="blue" onClick={stopConversation} isDisabled={conversationFinished}>
          Stop Gesprek
        </Button>
      ) : (
        <Button colorScheme="blue" onClick={startConversation}>
          Start Gesprek
        </Button>
      )}

      {conversationFinished && (
        <Text fontSize="md" color="green.300">Gesprek voltooid! Download samenvatting <a href={summaryFileUrl} download>hier</a>.</Text>
      )}
    </VStack>
  );

  return (
    <ChakraProvider>
      <Flex minH="100vh" align="center" justify="center" bg="gray.900">
        <Box
          bg="gray.800"
          p={8}
          rounded="lg"
          boxShadow="lg"
          maxW="lg"
          w="100%"
        >
          {step === 0 && renderSessionIdStep()}
          {step === 1 && renderLanguageSelectionStep()}
          {step === 2 && renderMediaSettingsStep()}
          {step === 3 && renderConversationStep()}
        </Box>
      </Flex>
    </ChakraProvider>
  );
}

export default App;
