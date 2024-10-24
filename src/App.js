import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Button, Text, IconButton, VStack, HStack, Flex, Checkbox, Select } from '@chakra-ui/react';
import { FaMicrophone, FaVideo } from 'react-icons/fa';
import axios from 'axios';

function App() {
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('EN');
  const [cameraOn, setCameraOn] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [sessionIdValid, setSessionIdValid] = useState(false);
  const [sessionIdError, setSessionIdError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationFinished, setConversationFinished] = useState(false);
  const [summaryFileUrl, setSummaryFileUrl] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState(null);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null);

  // Maak nieuwe sessie aan
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

  const validateSessionId = async () => {
    try {
      const response = await axios.get('https://beasy.ai/api/validate_session', {
        params: { session_id: sessionId }
      });
      if (response.data.valid) {
        setSessionIdValid(true);
        setSessionIdError('');
        setStep(1);
      } else {
        setSessionIdError('Sessie-ID niet gevonden in de database.');
        setSessionIdValid(false);
      }
    } catch (error) {
      console.error('Error validating session:', error);
      setSessionIdError('Fout bij het valideren van de sessie.');
    }
  };

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

  const playAudio = (audioUrl) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.play().then(resolve).catch(reject);
      audio.onended = () => resolve();
    });
  };

  const requestCameraAndMicrophoneAccess = () => {
    // Vraag om toegang tot camera en microfoon als deze pagina geopend wordt
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      setVideoDevices(videoInputDevices);
      setAudioDevices(audioInputDevices);
    }).catch((err) => console.error('Error accessing media devices:', err));
  };

  useEffect(() => {
    if (step === 2) {
      requestCameraAndMicrophoneAccess(); // Alleen toegang vragen wanneer de gebruiker op de camera/microfoonpagina komt
    }
  }, [step]);

  const toggleCamera = () => {
    if (cameraOn) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    } else {
      navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedVideoDevice } })
        .then((stream) => setCameraStream(stream))
        .catch((err) => console.error('Error starting camera:', err));
    }
    setCameraOn(!cameraOn);
  };

  const toggleMicrophone = () => {
    if (!microphoneOn) {
      navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedAudioDevice } })
        .then(() => setMicrophoneOn(true))
        .catch((err) => console.error('Error starting microphone:', err));
    } else {
      setMicrophoneOn(false);
    }
  };

  const renderSessionIdStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Voer uw sessie-ID in om verder te gaan:</Text>
      <input
        type="text"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        placeholder="Sessie-ID"
        style={{ padding: '10px', fontSize: '16px' }}
      />
      <Text fontSize="lg">Of voer het master wachtwoord in voor een nieuwe sessie aan te maken:</Text>
      <input
        type="password"
        placeholder="Voer wachtwoord in"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: '10px', fontSize: '16px' }}
      />
      <Button colorScheme="blue" onClick={createSession} isDisabled={!password}>
        Maak Sessie aan
      </Button>
      {sessionId && sessionIdValid && (
        <Text color="green.400">Sessie succesvol aangemaakt! Sessie-ID: {sessionId}</Text>
      )}
      {sessionIdError && <Text color="red.400">{sessionIdError}</Text>}

      <Button colorScheme="blue" onClick={validateSessionId} disabled={!sessionId}>
        Volgende
      </Button>
    </VStack>
  );

  const renderTermsStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Lees en accepteer de algemene voorwaarden:</Text>
      <Box bg="gray.700" p={4} rounded="md" maxH="200px" overflowY="scroll">
        <Text>
          Dit zijn de algemene voorwaarden en privacyregels...
        </Text>
      </Box>
      <Checkbox onChange={() => setAgreedToTerms(!agreedToTerms)} isChecked={agreedToTerms}>
        Ik ga akkoord met de regels en voorwaarden
      </Checkbox>
      <HStack>
        <Button colorScheme="gray" onClick={() => setStep(step - 1)}>Terug</Button>
        <Button colorScheme="blue" onClick={() => setStep(2)} disabled={!agreedToTerms}>
          Volgende
        </Button>
      </HStack>
    </VStack>
  );

  const renderSettingsStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Kies je camera en microfoon apparaat:</Text>

      <HStack>
        <Text>Camera:</Text>
        <Select value={selectedVideoDevice} onChange={(e) => setSelectedVideoDevice(e.target.value)}>
          {videoDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </Select>
        <Button onClick={toggleCamera} colorScheme={cameraOn ? 'green' : 'red'}>
          {cameraOn ? 'Camera Uit' : 'Camera Aan'}
        </Button>
      </HStack>

      {cameraOn && cameraStream && (
        <video autoPlay muted playsInline style={{ width: '200px', height: '150px' }} ref={(video) => {
          if (video) {
            video.srcObject = cameraStream;
          }
        }} />
      )}

      <HStack>
        <Text>Microfoon:</Text>
        <Select value={selectedAudioDevice} onChange={(e) => setSelectedAudioDevice(e.target.value)}>
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microfoon ${device.deviceId}`}
            </option>
          ))}
        </Select>
        <IconButton
          aria-label="Toggle microphone"
          icon={<FaMicrophone />}
          colorScheme={microphoneOn ? 'green' : 'red'}
          onClick={toggleMicrophone}
        />
      </HStack>

      <HStack>
        <Button colorScheme="gray" onClick={() => setStep(step - 1)}>Terug</Button>
        <Button colorScheme="blue" onClick={() => setStep(3)} disabled={!cameraOn && !microphoneOn}>
          Start Interview
        </Button>
      </HStack>
    </VStack>
  );

  const renderInterviewStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Het interview is gestart:</Text>
      <Button colorScheme="blue" onClick={startConversation} disabled={conversationStarted || isProcessing}>
        Start Gesprek
      </Button>
      {aiResponse && <Text>AI Vraag: {aiResponse}</Text>}
      {conversationFinished && (
        <>
          <Text>Het gesprek is afgelopen. Download het gespreksverslag hieronder:</Text>
          <Button as="a" href={summaryFileUrl} download="summary.txt" colorScheme="green">
            Download Samenvatting
          </Button>
        </>
      )}
      {!conversationFinished && conversationStarted && (
        <Button colorScheme="red" onClick={stopConversation}>Stop Gesprek</Button>
      )}
    </VStack>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return renderSessionIdStep();
      case 1:
        return renderTermsStep();
      case 2:
        return renderSettingsStep();
      case 3:
        return renderInterviewStep();
      default:
        return <Text>Error: Ongeldige stap</Text>;
    }
  };

  return (
    <ChakraProvider>
      <Flex direction="column" align="center" justify="center" minH="100vh" bg="gray.900" color="white">
        <Box p={8} maxW="500px" bg="gray.800" rounded="md" shadow="lg">
          {renderStepContent()}
        </Box>
      </Flex>
    </ChakraProvider>
  );
}

export default App;
