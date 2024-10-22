import React from 'react';
import { Box, Text } from '@chakra-ui/react';

function AudioVisualizer({ isRecording }) {
  return (
    <Box w="100%" h="100px" bg="gray.700" rounded="md" display="flex" justifyContent="center" alignItems="center">
      {isRecording ? (
        <Text fontSize="lg" color="red.500">Opname bezig...</Text>
      ) : (
        <Text fontSize="lg" color="gray.400">Geen opname actief</Text>
      )}
    </Box>
  );
}

export default AudioVisualizer;
