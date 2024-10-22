import React, { useState } from 'react';
import { Box, Button, VStack, HStack, Select, Text } from '@chakra-ui/react';

function StartSettingScreen({ setStep, setLanguage }) {
  const [cameraPreview, setCameraPreview] = useState(false);
  const [audioInput, setAudioInput] = useState('');

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    localStorage.setItem('language', e.target.value);  // Taal opslaan in lokale opslag
  };

  return (
    <Box bg="gray.800" p={8} rounded="md" w="400px">
      <VStack spacing={4}>
        <Text fontSize="lg">Instellingen</Text>

        {/* Taalkeuze */}
        <HStack spacing={4}>
          <Text>Taal</Text>
          <Select onChange={handleLanguageChange} defaultValue="EN">
            <option value="EN">Engels</option>
            <option value="NL">Nederlands</option>
            <option value="FR">Frans</option>
          </Select>
        </HStack>

        {/* Camera preview aan/uit */}
        <Button onClick={() => setCameraPreview(!cameraPreview)}>
          {cameraPreview ? 'Camera Uit' : 'Camera Aan'}
        </Button>

        {/* Terug naar startscherm */}
        <Button colorScheme="blue" onClick={() => setStep(1)}>
          Opslaan en Terug
        </Button>
      </VStack>
    </Box>
  );
}

export default StartSettingScreen;
