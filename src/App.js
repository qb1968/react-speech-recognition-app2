import MicRecorder from "mic-recorder-to-mp3"
import { useEffect, useState, useRef } from "react"
import { Oval } from "react-loader-spinner"
import logo from "./logo.png"
import axios from "axios"
const APIKey = process.env.REACT_APP_API_KEY

// Set AssemblyAI Axios Header
const assemblyAI = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: APIKey,
    "content-type": "application/json",
    "transfer-encoding": "chunked",
  },
})

const App = () => {
  // Mic-Recorder-To-MP3
  const recorder = useRef(null) //Recorder
  const audioPlayer = useRef(null) //Ref for the HTML Audio Tag
  const [blobURL, setBlobUrl] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isRecording, setIsRecording] = useState(null)

  useEffect(() => {
    //Declares the recorder object and stores it inside of ref
    recorder.current = new MicRecorder({ bitRate: 128 })
  }, [])

  const startRecording = () => {
    // Check if recording isn't blocked by browser
    recorder.current.start().then(() => {
      setIsRecording(true)
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
      })
      .catch((e) => console.log(e))
  }

  // AssemblyAI

  // States
  const [uploadURL, setUploadURL] = useState("")
  const [transcriptID, setTranscriptID] = useState("")
  const [transcriptData, setTranscriptData] = useState("")
  const [transcript, setTranscript] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Upload the Audio File and retrieve the Upload URL
  useEffect(() => {
    if (audioFile) {
      assemblyAI
        .post("/upload", audioFile)
        .then((res) => setUploadURL(res.data.upload_url))
        .catch((err) => console.error(err))
    }
  }, [audioFile])

  // Submit the Upload URL to AssemblyAI and retrieve the Transcript ID
  const submitTranscriptionHandler = () => {
    assemblyAI
      .post("/transcript", {
        audio_url: uploadURL,
      })
      .then((res) => {
        setTranscriptID(res.data.id)

        checkStatusHandler()
      })
      .catch((err) => console.error(err))
  }

  // Check the status of the Transcript
  const checkStatusHandler = async () => {
    setIsLoading(true)
    try {
      await assemblyAI.get(`/transcript/${transcriptID}`).then((res) => {
        setTranscriptData(res.data)
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Periodically check the status of the Transcript
  useEffect(() => {
    const interval = setInterval(() => {
      if (transcriptData.status !== "completed" && isLoading) {
        checkStatusHandler()
      } else {
        setIsLoading(false)
        setTranscript(transcriptData.text)

        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  })

  return (
    <div className='flex flex-col items-center justify-center mt-10 mb-20 space-y-4'>
      <h1 className='text-4xl'>MySecretary 🎧</h1>
      <h3 className='text-2xl'>
        Powered by{" "}
        <a
          className='text-secondary animate-pulse'
          href='https://www.assemblyai.com/'
          target='_blank'
          rel='noreferrer'
        >
          AssemblyAI
        </a>
      </h3>
      <img className='max-h-64' src={logo} alt='logo' />
      <div>
        <button
          className='btn btn-primary'
          onClick={startRecording}
          disabled={isRecording}
        >
          Record
        </button>
        <button
          className='btn btn-warning'
          onClick={stopRecording}
          disabled={!isRecording}
        >
          Stop
        </button>
      </div>
      <audio ref={audioPlayer} src={blobURL} controls='controls' />
      <button
        className='btn btn-secondary'
        onClick={submitTranscriptionHandler}
      >
        Submit for Transcription
      </button>

      {isLoading ? (
        <div>
          <Oval
            ariaLabel='loading-indicator'
            height={100}
            width={100}
            strokeWidth={5}
            color='red'
            secondaryColor='yellow'
          />
          <p className='text-center'>Is loading....</p>
        </div>
      ) : (
        <div></div>
      )}
      {!isLoading && transcript && (
        <div className='w-2/3 lg:w-1/3 mockup-code'>
          <p className='p-6'>{transcript}</p>
        </div>
      )}
    </div>
  )
}

export default App
