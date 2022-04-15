import { useCallback, useEffect, useState, MutableRefObject } from 'react';
import { getVideoLayout } from '../video-layout-helper';
import { useRenderVideo } from './useRenderVideo';
import { Dimension, Pagination, CellLayout } from '../video-types';
import { ZoomClient, MediaStream, Participant } from '../../../index-types';
/**
 * Default order of video:
 *  1. video's participants first
 *  2. self on the second position
 */
export function useGalleryLayout(
  zmClient: ZoomClient,
  mediaStream: MediaStream | null,
  isVideoDecodeReady: boolean,
  videoRef: MutableRefObject<HTMLCanvasElement | null>,
  dimension: Dimension,
  pagination: Pagination,
) {
  const [visibleParticipants, setVisibleParticipants] = useState<Participant[]>([]);
  const [layout, setLayout] = useState<CellLayout[]>([]);
  const [subscribedVideos, setSubscribedVideos] = useState<number[]>([]);
  const { page, pageSize, totalPage, totalSize } = pagination;
  let size = pageSize - 1;
  
  if (page === totalPage - 1) {
    size = Math.min(size, totalSize % pageSize || size);
  }
  useEffect(() => {
    setLayout(getVideoLayout(dimension.width, dimension.height, size));
  }, [dimension, size]);
  const onParticipantsChange = useCallback(() => {
    console.log("====Participants Change In the Room====");
    const participants = zmClient.getAllUser();
    //const testParticipants = zmClient.getUser();
    const currentUser = zmClient.getCurrentUserInfo();
    const currentUserId = currentUser.userId;
    console.log("there are " + participants.length + " participants" );
    //for(let i = 0; i<participants.length;i++){
    //  console.log("participants info test " + i + " " + participants[i].userId);
    //  console.log("Is this a host " + participants[i].isHost);
      //console.log("Participant display name " + participants[i].isManager);
    //}
    console.log("currentuser id " + currentUser.userId);
    console.log("currentuser display name " + currentUser.displayName);
    console.log("Am I a host " + currentUser.isHost);
    // using right left flag to control right left camera to catch
    let getRightCamera = true;
    let getLeftCamera = true;
    if (currentUser && participants.length > 0) {
      let pageParticipants: any[] = [];
      if (participants.length === 1) {
        pageParticipants = participants;
      } 
      else if(participants.length === 2){
        const test1 = participants.slice(1);
        pageParticipants = test1;
      }
      else 
      {
        // create a meeting order list based on UserID
        let LeftCamera = false;
        let RightCamera = false;
        let LeftCameraFindItRightCameraId = 0;
        let orderListLargeIdSet: any[] = [];
        let orderListSmallIdSet: any[] = [];
        let rightCameraSet: any[] = []; 
        let leftCameraSet: any[] = [];
        let orderListAllIdSet: any[] = [];
        let myMeetingOrderList: any[] = [];
        let onlyshowMyselfParticipant: any[] = [];
        
        // create a list for detecting left right camera
        for(let i = 0; i<participants.length;i++){
          orderListAllIdSet.push(participants[i]);
          if(participants[i].userId === currentUser.userId){
            onlyshowMyselfParticipant.push(participants[i]);
          }
        }
        orderListAllIdSet.sort((user2:Participant, user1:Participant) => user2.userId - user1.userId);
        // brute force method to distinguish left or right camera for current user
        for(let i = 0; i<orderListAllIdSet.length;i++){
          //console.log(orderListAllIdSet[i].userId + "compare to " + currentUser.userId);
          if(orderListAllIdSet[i].userId == currentUser.userId){
            if(i%2 == 0){ // left camera always smaller in sequence
              LeftCamera = true;
              RightCamera = false;
              //console.log("I'm a Left camera!!! ");
            }else{
              LeftCamera = false;
              RightCamera = true;
              //console.log("I'm a Right camera!!! ");
            }
          }
          if(LeftCamera==true){
            if(i+1<orderListAllIdSet.length){
            LeftCameraFindItRightCameraId = orderListAllIdSet[i+1].userId;
            break;
            }
          }
        }
        if(LeftCamera){
          for(let i = 0; i<participants.length;i++){
            if(participants[i].userId !== currentUserId && participants[i].userId !== LeftCameraFindItRightCameraId && participants[i].userId > currentUserId ){
              orderListLargeIdSet.push(participants[i]);
            }
            if(participants[i].userId !== currentUserId && participants[i].userId !== LeftCameraFindItRightCameraId && participants[i].userId < currentUserId ){
              orderListSmallIdSet.push(participants[i]);
            }
          }
          

          orderListLargeIdSet.sort((user2:Participant, user1:Participant) => user2.userId - user1.userId);
          orderListSmallIdSet.sort((user2:Participant, user1:Participant) => user2.userId - user1.userId);

          console.log("both set number should be even right now = " + orderListLargeIdSet.length + " "+ orderListSmallIdSet.length);

          
          for(let i=0; i<orderListLargeIdSet.length; i++){
            console.log("searching through large id set" + i + " = " + orderListLargeIdSet[i].userId);
            if(i%2===1 && getRightCamera == true){
              rightCameraSet.push(orderListLargeIdSet[i]);
              getRightCamera = false;
            }
            if(i%2===0 && getRightCamera == false && getLeftCamera == true){
              leftCameraSet.push(orderListLargeIdSet[i]);
              getLeftCamera = false;
            }
          }
          for(let i=0; i<orderListSmallIdSet.length; i++){
            console.log("searching through small id set" + i + " = " + orderListSmallIdSet[i].userId);
            if(i%2===1 && getRightCamera == true){
              rightCameraSet.push(orderListSmallIdSet[i]);
              getRightCamera = false;
            }
            if(i%2===0 && getRightCamera == false && getLeftCamera == true){
              leftCameraSet.push(orderListSmallIdSet[i]);
              getLeftCamera = false;
            }
          }

          //myMeetingOrderList = orderListLargeIdSet.concat(orderListSmallIdSet);
          myMeetingOrderList = rightCameraSet.concat(leftCameraSet);
          console.log("my order list length " + myMeetingOrderList.length);
 
          pageParticipants = myMeetingOrderList;
          //   .filter((user:Participant) => user.userId !== currentUser.userId)
          //   .sort((user2:Participant, user1:Participant) => Number(user1.bVideoOn) - Number(user2.bVideoOn));
          // pageParticipants.splice(1, 0, currentUser);
          pageParticipants = pageParticipants.filter(
            (_user, index) => Math.floor(index / pageSize) === page,
          );
        }
        // only shows my self in right camera
        if(RightCamera){
          pageParticipants = onlyshowMyselfParticipant;
        }
		//const test1 = participants.slice(1);
		//test1.shift();
		//pageParticipants = test1;
      }
      setVisibleParticipants(pageParticipants);
      const videoParticipants = pageParticipants
        .filter((user) => user.bVideoOn)
        .map((user) => user.userId);
      setSubscribedVideos(videoParticipants);
    }
  }, [zmClient, page, pageSize]);
  useEffect(() => {
    zmClient.on('user-added', onParticipantsChange);
    zmClient.on('user-removed', onParticipantsChange);
    zmClient.on('user-updated', onParticipantsChange);
    return () => {
      zmClient.off('user-added', onParticipantsChange);
      zmClient.off('user-removed', onParticipantsChange);
      zmClient.off('user-updated', onParticipantsChange);
    };
  }, [zmClient, onParticipantsChange]);
  useEffect(() => {
    onParticipantsChange();
  }, [onParticipantsChange]);

  useRenderVideo(
    mediaStream,
    isVideoDecodeReady,
    videoRef,
    layout,
    subscribedVideos,
    visibleParticipants,
  );
  return {
    visibleParticipants,
    layout,
  };
}
