import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Button, Text, IconButton, VStack, HStack, Flex, Checkbox, Select } from '@chakra-ui/react';
import { FaMicrophone, FaVideo, FaPhoneAlt, FaCog } from 'react-icons/fa';
import axios from 'axios';

function App() {
  const [step, setStep] = useState(0);  // Step in the process
  const [sessionId, setSessionId] = useState('');  // Interview session ID
  const [password, setPassword] = useState(''); // State for password input
  const [language, setLanguage] = useState('EN');  // Selected language
  const [cameraOn, setCameraOn] = useState(false);  // Camera state
  const [microphoneOn, setMicrophoneOn] = useState(false);  // Microphone state
  const [isRecording, setIsRecording] = useState(false);  // Recording state
  const [conversationStarted, setConversationStarted] = useState(false);  // Conversation status
  const [aiResponse, setAiResponse] = useState(null);  // AI response from the server
  const [agreedToTerms, setAgreedToTerms] = useState(false);  // Agreement to terms

  // New state variables
  const [isProcessing, setIsProcessing] = useState(false);  // Processing state
  const [conversationFinished, setConversationFinished] = useState(false);  // Conversation finished state
  const [summaryFileUrl, setSummaryFileUrl] = useState('');  // Summary file URL


  // Maak nieuwe sessie aan
  const createSession = async () => {
    try {
      // Start a new session
      const sessionResponse = await axios.post('https://beasy.ai/api/start_session', {
        password: password, // Use the password from the input
      });
      const { session_id } = sessionResponse.data;
  
      if (session_id) {
        setSessionId(session_id); // Set the session ID in state
        setStep(1);  // Proceed to the next step after successfully creating a session
      } else {
        console.error("Failed to create session, no session ID returned.");
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };
  

  // Start gesprek, en haal eerste AI vraag
  const startConversation = async () => {
    try {
      if (!sessionId) {
        console.error("Session ID is required to start conversation");
        return;
      }
      const response = await axios.get('http://localhost:5000/api/initial_question', { params: { session_id: sessionId } });
      const { question, speech_file_url } = response.data;
      setAiResponse(question);
      setConversationStarted(true);
  
      if (speech_file_url) {
        await playAudio(`http://localhost:5000${speech_file_url}`);
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
      setIsProcessing(true); // Disable the button while processing
      const response = await axios.post('https://beasy.ai/api/conversation', formData, {
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
        await playAudio(`https://beasy.ai${speech_file_url}`);
      } else {
        console.error('No valid speech file URL returned from server');
      }
    } catch (error) {
      console.error('Error sending audio to the server:', error);
    } finally {
      setIsProcessing(false); // Re-enable the button when processing and playback are finished
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

      console.log("Conversation stopped and summary generated:", summary_file);
    } catch (error) {
      console.error('Error stopping the conversation:', error);
    }
  };

  

  // Speel de audio van de AI af
  const playAudio = (audioUrl) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.play().then(resolve).catch(reject);
      audio.onended = () => resolve();
    });
  };

  // Toggelen van camera
  const toggleCamera = () => {
    setCameraOn((prev) => !prev);
  };

  // Toggelen van microfoon
  const toggleMicrophone = () => {
    setMicrophoneOn((prev) => !prev);
  };

  // Toggelen van opnemen met visuele feedback
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Stap 1: Sessie-ID invoeren of tonen na creatie
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
      onChange={(e) => setPassword(e.target.value)} // Update password state
      style={{ marginBottom: '10px', fontSize: '16px' }}
    />
    <Button colorScheme="blue" onClick={createSession} isDisabled={!password}>
      Maak Sessie aan
    </Button>
    {sessionId && (
      <Text color="green.400">Sessie succesvol aangemaakt! Sessie-ID: {sessionId}</Text>
    )}
    {/* De button naar de volgende stap is hier onder het tonen van de sessie-ID geplaatst */}
    <Button colorScheme="blue" onClick={() => setStep(1)} disabled={!sessionId}>
      Volgende
    </Button>
  </VStack>
);


  // Stap 2: Algemene regels en privacy goedkeuren
  const renderTermsStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Lees en accepteer de algemene voorwaarden:</Text>
      <Box bg="gray.700" p={4} rounded="md" maxH="200px" overflowY="scroll">
        {/* Simuleer de inhoud van regels */}
        <Text>
          Dit zijn de algemene voorwaarden en privacyregels...
          {/* Voer hier je eigen tekst in */}
        </Text>
      </Box>
      <Checkbox onChange={() => setAgreedToTerms(!agreedToTerms)} isChecked={agreedToTerms}>
        Ik ga akkoord met de regels en voorwaarden
      </Checkbox>
      <Button colorScheme="blue" onClick={() => setStep(2)} disabled={!agreedToTerms}>
        Volgende
      </Button>
    </VStack>
  );

  // Stap 3: Camera en microfoon instellingen
  const renderSettingsStep = () => (
    <VStack spacing={4}>
      <Text fontSize="lg">Kies je camera en microfoon apparaat:</Text>
      <HStack>
        <Text>Camera:</Text>
        <Button onClick={toggleCamera} colorScheme={cameraOn ? 'green' : 'red'}>
          {cameraOn ? 'Camera Uit' : 'Camera Aan'}
        </Button>
      </HStack>
      <HStack>
        <Text>Microfoon:</Text>
        <Button onClick={toggleMicrophone} colorScheme={microphoneOn ? 'green' : 'red'}>
          {microphoneOn ? 'Microfoon Uit' : 'Microfoon Aan'}
        </Button>
      </HStack>
      <HStack>
        <Text>Taal:</Text>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="EN">Engels</option>
          <option value="NL">Nederlands</option>
          <option value="FR">Frans</option>
        </Select>
      </HStack>
      <Button colorScheme="blue" onClick={() => setStep(3)}>
        Start Interview
      </Button>
    </VStack>
  );

  // Stap 4: Videocall UI met AI en audio
  const renderVideoCallUI = () => (
    <VStack spacing={6}>
      <Flex justifyContent="space-between" p={4} alignItems="center" w="100%">
        <Text fontSize="2xl">Interview App</Text>
        <IconButton icon={<FaCog />} aria-label="Settings" onClick={() => setStep(2)} />
      </Flex>
      <Box>
        <Text fontSize="lg">{conversationStarted ? aiResponse : "Start het interview om te beginnen"}</Text>
      </Box>
      <HStack spacing={4}>
        <IconButton
          icon={<FaMicrophone />}
          aria-label="Toggle Microphone"
          bg={microphoneOn ? "green.500" : "gray.600"}
          onClick={toggleMicrophone}
        />
        <IconButton
          icon={<FaVideo />}
          aria-label="Toggle Camera"
          bg={cameraOn ? "green.500" : "gray.600"}
          onClick={toggleCamera}
        />
        <IconButton
          icon={<FaPhoneAlt />}
          aria-label="End Call"
          bg="red.500"
          onClick={() => setConversationStarted(false)}
        />
      </HStack>
      <Button onClick={toggleRecording} colorScheme={isRecording ? 'red' : 'blue'}>
        {isRecording ? 'Stop Opname' : 'Start Opname'}
      </Button>

      {/* AI Avatar met status */}
      <Box bg="gray.600" w="80px" h="80px" borderRadius="full" display="flex" justifyContent="center" alignItems="center">
        <Text fontSize="lg" color="white">{conversationStarted ? 'AI' : ''}</Text>
      </Box>

      {/* Audiovisualisatie */}
      <Box w="100%" h="100px" bg="gray.700" rounded="md" display="flex" justifyContent="center" alignItems="center">
        {isRecording ? (
          <Text fontSize="lg" color="red.500">Opname bezig...</Text>
        ) : (
          <Text fontSize="lg" color="gray.400">Geen opname actief</Text>
        )}
      </Box>
    </VStack>
  );

  return (
    <ChakraProvider>
      <Box bg="gray.900" height="100vh" color="white" display="flex" justifyContent="center" alignItems="center">
        {step === 0 && renderSessionIdStep()}
        {step === 1 && renderTermsStep()}
        {step === 2 && renderSettingsStep()}
        {step === 3 && renderVideoCallUI()}
      </Box>
    </ChakraProvider>
  );
}

export default App;
