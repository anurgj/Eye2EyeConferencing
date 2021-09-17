import React, {
  useEffect,
  useContext,
  useState,
  useCallback,
  useReducer,
} from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import ZoomMtgCm from "@zoomus/instantsdk";
import { message, Modal } from "antd";
import "antd/dist/antd.css";
import produce from "immer";
import Home from "./feature/home/home";
import Video from "./feature/video/video";
import VideoSingle from "./feature/video/video-single";
import ZoomContext from "./context/zoom-context";
import ZoomMediaContext from "./context/media-context";
import ChatContext from "./context/chat-context";
import LoadingLayer from "./component/loading-layer";
import Chat from "./feature/chat/chat";
import { ChatClient, MediaStream, ZoomClient } from "./index-types";
import "./App.css";

interface AppProps {
  meetingArgs: {
    sdkKey: string;
    topic: string;
    signature: string;
    name: string;
    password?: string;
  };
}
const mediaShape = {
  audio: {
    encode: false,
    decode: false,
  },
  video: {
    encode: false,
    decode: false,
  },
  share: {
    encode: false,
    decode: false,
  },
};
const mediaReducer = produce((draft, action) => {
  switch (action.type) {
    case "audio-encode": {
      draft.audio.encode = action.payload;
      break;
    }
    case "audio-decode": {
      draft.audio.decode = action.payload;
      break;
    }
    case "video-encode": {
      draft.video.encode = action.payload;
      break;
    }
    case "video-decode": {
      draft.video.decode = action.payload;
      break;
    }
    case "share-encode": {
      draft.share.encode = action.payload;
      break;
    }
    case "share-decode": {
      draft.share.decode = action.payload;
      break;
    }
    default:
      break;
  }
}, mediaShape);

function App(props: AppProps) {
  const {
    meetingArgs: { sdkKey, topic, signature, name, password },
  } = props;
  const [loading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("");
  const [isFailover, setIsFailover] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("closed");
  const [mediaState, dispatch] = useReducer(mediaReducer, mediaShape);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const zmClient = useContext<ZoomClient>(ZoomContext);
  const [isSupportGalleryView, setIsSupportGalleryView] = useState<boolean>(
    true
  );
  useEffect(() => {
    const init = async () => {
      await zmClient.init("en-US", `${window.location.origin}/lib`);
      try {
        setLoadingText("Joining the session...");
        await zmClient.join(topic, signature, name, password);
        const stream = zmClient.getMediaStream();
        setMediaStream(stream);
        setIsSupportGalleryView(stream.isSupportMultipleVideos());
        const chatClient = zmClient.getChatClient();
        setChatClient(chatClient);
        setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
        console.warn(e);
        message.error(e.reason);
      }
    };
    init();
    return () => {
      ZoomMtgCm.destroyClient();
    };
  }, [sdkKey, signature, zmClient, topic, name, password]);
  const onConnectionChange = useCallback(
    (payload) => {
      if (payload.state === "Reconnecting") {
        setIsLoading(true);
        setIsFailover(true);
        setStatus("connecting");
        const { reason } = payload;
        if (reason === "failover") {
          setLoadingText("Session Disconnected,Try to reconnect");
        }
      } else if (payload.state === "Connected" ) {
        setStatus("connected");
        if(isFailover){
          setIsLoading(false);
        }
      } else if (payload.state === "Closed") {
        setStatus("closed");
        if (payload.reason === "ended by host") {
          Modal.warning({
            title: "Session ended",
            content: "This session has been ended by host",
          });
        }
      }
    },
    [isFailover]
  );
  const onMediaSDKChange = useCallback((payload) => {
    const { action, type, result } = payload;
    dispatch({ type: `${type}-${action}`, payload: result === "success" });
  }, []);
  const onLeaveOrJoinSession = useCallback(async () => {
    if (status === "closed") {
      setIsLoading(true);
      await zmClient.join(topic, signature, name, password);
      setIsLoading(false);
    } else if (status === "connected") {
      await zmClient.leave();
      message.warn('You have left the session.')
    }
  }, [zmClient, status, topic, signature, name, password]);
  useEffect(() => {
    zmClient.on("connection-change", onConnectionChange);
    zmClient.on("media-sdk-change", onMediaSDKChange);
    return () => {
      zmClient.off("connection-change", onConnectionChange);
      zmClient.off("media-sdk-change", onMediaSDKChange);
    };
  }, [zmClient, onConnectionChange, onMediaSDKChange]);
  return (
    <div className="App">
      {loading && <LoadingLayer content={loadingText} />}
      {!loading && (
        <ZoomMediaContext.Provider value={{ ...mediaState, mediaStream }}>
          <ChatContext.Provider value={chatClient}>
            <Router>
              <Switch>
                <Route
                  path="/"
                  render={(props) => (
                    <Home
                      {...props}
                      status={status}
                      onLeaveOrJoinSession={onLeaveOrJoinSession}
                    />
                  )}
                  exact
                />
                <Route
                  path="/video"
                  component={isSupportGalleryView ? Video : VideoSingle}
                />
                <Route path="/chat" component={Chat} />
              </Switch>
            </Router>
          </ChatContext.Provider>
        </ZoomMediaContext.Provider>
      )}
    </div>
  );
}

export default App;
