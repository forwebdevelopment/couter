"use client";

import { useEffect, useRef, useState } from "react";

export default function useVoiceCounter({
  onCountIncrease,
  targetWords = ["ram", "राम" , "Radha"],
  language = "hi-IN",
}) {
  const recognitionRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [lastSpokenWord, setLastSpokenWord] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);

      setVoiceMessage(
        "Voice recognition is not supported in this browser."
      );

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event) => {
      const result =
        event.results[event.results.length - 1];

      const transcript =
        result[0].transcript
          .trim()
          .toLowerCase();

      setLastSpokenWord(transcript);

      const words =
        transcript.split(/\s+/);

      let detectedCount = 0;

      words.forEach((word) => {
        if (
          targetWords
            .map((item) => item.toLowerCase())
            .includes(word)
        ) {
          detectedCount++;
        }
      });

      if (
        detectedCount > 0 &&
        onCountIncrease
      ) {
        onCountIncrease(detectedCount);
      }
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setVoiceMessage(
        `Microphone error: ${event.error}`
      );
    };

    recognition.onend = () => {
      if (
        recognitionRef.current
          ?.keepListening
      ) {
        try {
          recognition.start();
        } catch (error) {
          console.error(error);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current =
      recognition;

    return () => {
      recognition.keepListening =
        false;

      recognition.stop();
    };
  }, [
    language,
    onCountIncrease,
    targetWords,
  ]);


  function startListening() {
    if (!recognitionRef.current) {
      setVoiceMessage(
        "Voice recognition is not available."
      );

      return;
    }

    try {
      recognitionRef.current.keepListening =
        true;

      recognitionRef.current.start();

      setIsListening(true);

      setVoiceMessage(
        `Listening... Say "${targetWords[0]}"`
      );

    } catch (error) {
      console.error(error);
    }
  }


  function stopListening() {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.keepListening =
      false;

    recognitionRef.current.stop();

    setIsListening(false);

    setVoiceMessage(
      "Voice counter stopped."
    );
  }


  return {
    supported,
    isListening,
    lastSpokenWord,
    voiceMessage,
    startListening,
    stopListening,
  };
}