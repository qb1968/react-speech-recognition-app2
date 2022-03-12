import MicRecorder from "mic-recorder-to-mp3"
import { useEffect, useState, useRef } from "react"
const axios = require("axios")
const APIKey = process.env.REACT_APP_API_KEY

const App = () => {
  // Mic-Recorder-To-MP3 Stuff
  const recorder = useRef(null) //Recorder
  const audioPlayer = useRef(null) //Ref for HTML Audio tag

  const [blobURL, setBlobUrl] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isRecording, setIsRecording] = useState(null)
  const [play, setPlay] = useState(false)

  useEffect(() => {
    //Declares the recorder object and stores it in ref
    recorder.current = new MicRecorder({ bitRate: 128 })
  }, [])

  const startRecording = () => {
    //start() returns a promise incase if audio is not blocked by browser
    recorder.current.start().then(() => {
      setIsRecording(true)
      console.log(`Start Recording...`)
    })
  }

  const stopRecording = () => {
    recorder.current
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, "audio.mp3", {
          type: blob.type,
          lastModified: Date.now(),
        })
        const newBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(newBlobUrl)
        setIsRecording(false)
        setAudioFile(file)
        console.log(`Stop Recording...`)
      })
      .catch((e) => console.log(e))
  }

  useEffect(() => {
    if (audioFile) {
      console.log(audioFile)
    }
  }, [audioFile])

  // Assembly AI Stuff
  const assemblyAI = axios.create({
    baseURL: "https://api.assemblyai.com/v2",
    headers: {
      authorization: APIKey,
      "content-type": "application/json",
      "transfer-encoding": "chunked",
    },
  })

  const [uploadURL, setUploadURL] = useState("")
  const [transcriptID, setTranscriptID] = useState("")
  const [transcriptData, setTranscriptData] = useState("")
  const [transcript, setTranscript] = useState("")

  useEffect(() => {
    if (audioFile) {
      console.log("/upload")
      assemblyAI
        .post("/upload", audioFile)
        .then((res) => setUploadURL(res.data.upload_url))
        .catch((err) => console.error(err))
    }
  }, [audioFile])

  const submitTranscriptionHandler = () => {
    console.log(`submitTranscriptionHandler -> send uploadURL: ${uploadURL}`)
    assemblyAI
      .post("/transcript", {
        audio_url: uploadURL,
      })
      .then((res) => setTranscriptID(res.data.id))
      .catch((err) => console.error(err))
  }

  const checkStatusHandler = () => {
    console.log(`checkStatusHandler -> uploadURL: ${uploadURL}`)
    assemblyAI
      .get(`/transcript/${transcriptID}`)
      .then((res) => setTranscriptData(res.data))
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (transcriptData.status === "completed") {
      setTranscript(transcriptData.text)
    }
  }, [transcriptData])

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Record
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop
      </button>
      <audio
        ref={audioPlayer}
        src={blobURL}
        controls='controls'
        onEnded={() => setPlay(false)} //event handler when audio has stopped playing
      />
      <button onClick={submitTranscriptionHandler}>
        Submit for Transcription
      </button>
      <button onClick={checkStatusHandler}>Check Status</button>
      {transcriptData && <p>{transcriptData.status}</p>}
      {transcript && <h2>{transcript}</h2>}
    </div>
  )
}

export default App
