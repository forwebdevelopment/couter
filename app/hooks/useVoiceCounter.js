"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function useVoiceCounter({
  onCountIncrease,
  targetWords = ["ram", "राम", "radha", "राधा"],
  language = "hi-IN",
}) {
  const recognitionRef = useRef(null);
  const enabledRef = useRef(false);
  const callbackRef = useRef(onCountIncrease);
  const wordsRef = useRef(targetWords);
  const silenceTimerRef = useRef(null);
  const restartTimerRef = useRef(null);

  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenWord, setLastSpokenWord] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");

  useEffect(() => {
    callbackRef.current = onCountIncrease;
    wordsRef.current = targetWords;
  }, [onCountIncrease, targetWords]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();

    silenceTimerRef.current = setTimeout(() => {
      if (enabledRef.current) {
        setVoiceMessage(
          "No voice detected. The counter is still listening."
        );
      }
    }, 10000);
  }, [clearSilenceTimer]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setVoiceMessage(
        "Voice recognition is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!enabledRef.current) return;

      setIsListening(true);
      setVoiceMessage("Listening for Ram or Radha...");
      startSilenceTimer();
    };

    recognition.onspeechstart = () => {
      if (!enabledRef.current) return;

      setIsSpeaking(true);
      setVoiceMessage("Speech detected...");
      clearSilenceTimer();
    };

    recognition.onspeechend = () => {
      setIsSpeaking(false);
      if (enabledRef.current) startSilenceTimer();
    };

    recognition.onresult = (event) => {
      if (!enabledRef.current) return;

      let detectedCount = 0;
      let latestTranscript = "";

      const targets = wordsRef.current.map((word) =>
        word.toLocaleLowerCase().trim()
      );

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        const transcript = result[0].transcript
          .trim()
          .toLocaleLowerCase();

        latestTranscript = transcript;

        // Match full phrases, including "shree harivansh" and "श्री हरिवंश".
        // Longer phrases go first so their individual words aren't counted again.
        const escapedTargets = targets
          .sort((a, b) => b.length - a.length)
          .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

        const pattern = new RegExp(
          `(^|[\\s.,!?।،؛:;]+)(${escapedTargets.join("|")})(?=$|[\\s.,!?।،؛:;]+)`,
          "gu"
        );

        detectedCount += [...transcript.matchAll(pattern)].length;
      }

      if (latestTranscript) {
        setLastSpokenWord(latestTranscript);
        setVoiceMessage(
          detectedCount > 0
            ? `Detected: ${latestTranscript}`
            : `Heard: ${latestTranscript}. Waiting for a target word.`
        );
        startSilenceTimer();
      }

      if (detectedCount > 0 && enabledRef.current) {
        callbackRef.current?.(detectedCount);
      }
    };

    recognition.onerror = (event) => {
      setIsSpeaking(false);

      if (!enabledRef.current) return;

      if (event.error === "no-speech") {
        setVoiceMessage(
          "No voice detected. The counter is still listening."
        );
        return;
      }

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        event.error === "audio-capture"
      ) {
        enabledRef.current = false;
        setIsListening(false);
        clearSilenceTimer();
        setVoiceMessage(
          event.error === "audio-capture"
            ? "No microphone was found. Check your microphone."
            : "Microphone access was blocked. Allow access and enable the counter again."
        );
        return;
      }

      setVoiceMessage(`Voice recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsSpeaking(false);
      setIsListening(false);
      clearSilenceTimer();

      // Browsers may end a recognition session during silence.
      // Start a new session while the toggle remains enabled.
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (!enabledRef.current) return;

          try {
            recognition.start();
          } catch (error) {
            setVoiceMessage("Could not restart voice recognition.");
            enabledRef.current = false;
            setIsListening(false);
          }
        }, 500);
      }
    };

    return () => {
      enabledRef.current = false;
      clearSilenceTimer();
      clearTimeout(restartTimerRef.current);
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [language, clearSilenceTimer, startSilenceTimer]);

  function startListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    clearTimeout(restartTimerRef.current);
    enabledRef.current = true;
    setVoiceMessage("Starting microphone...");

    try {
      recognition.start();
    } catch (error) {
      enabledRef.current = false;
      setVoiceMessage("Could not start the microphone. Please try again.");
    }
  }

  function stopListening() {
    enabledRef.current = false;
    clearTimeout(restartTimerRef.current);
    clearSilenceTimer();

    recognitionRef.current?.abort();
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceMessage("Voice counter is disabled.");
  }

  return {
    supported,
    isListening,
    isSpeaking,
    lastSpokenWord,
    voiceMessage,
    startListening,
    stopListening,
  };
}