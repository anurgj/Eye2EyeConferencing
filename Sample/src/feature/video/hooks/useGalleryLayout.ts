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
    //zmClient.changeName('abc'+participants.length,currentUserId);
    console.log("there are " + participants.length + " participants" );
    currentUser.testNewAttribute = currentUser.displayName;
    for(let i = 0; i<participants.length;i++){
    //  console.log("participants info test " + i + " " + participants[i].userId);
    //  console.log("Is this a host " + participants[i].isHost);
    //  console.log("Participant display name " + participants[i].isManager);
    //  console.log("Testing new attribute in for loop" + participants[i].testNewAttribute);
    }
    
    
    //console.log("currentuser id " + currentUser.userId);
    console.log("currentuser display name " + currentUser.displayName);
    //console.log("Am I a host " + currentUser.isHost);
    //console.log("Testing new attribute" + currentUser.testNewAttribute);
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
        let listAllNameSet: any[] = [];
        let orderListAllNameSet: any[] = [];
        // old method sorting based on userId
        /*
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
        */
       var currentUserDisplayName = currentUser.displayName.toUpperCase();
       for(let i = 0; i<participants.length;i++){
        orderListAllIdSet.push(participants[i]);

         let participantName = participants[i].displayName.toUpperCase();
         let newParticipantName;
         if(participantName.includes('LEFT')){
           newParticipantName = participantName.replace('LEFT','');
         }
         else if(participantName.includes('RIGHT')){
          newParticipantName = participantName.replace('RIGHT','');
         }
        if(!listAllNameSet.includes(newParticipantName)){
          listAllNameSet.push(newParticipantName);
        }
        if(participants[i].userId === currentUser.userId){
          onlyshowMyselfParticipant.push(participants[i]);
        }
       }
       orderListAllNameSet = listAllNameSet.sort();

       if(currentUserDisplayName.includes('LEFT')){
        
        var currentSeatNumber = 0;
        var currentUserDisplayNameUpper = currentUserDisplayName.toUpperCase();
        var newCurrentUserDisplayName = currentUserDisplayNameUpper.replace('LEFT','');
        for(let i = 0; i<orderListAllNameSet.length;i++){
          if(orderListAllNameSet[i].includes(newCurrentUserDisplayName)){
            currentSeatNumber = i;
            break;
          }
        }
        console.log('orderListAllNameSet.length = ' + orderListAllNameSet.length);
        console.log('I am '+ newCurrentUserDisplayName+ ' and seat number' +currentSeatNumber);
        // brute force method to get right camera of the next participant and left camera of the next next participant
        
        var getNextParticipantRightCameraSeatNumber = currentSeatNumber + 1;
        if(getNextParticipantRightCameraSeatNumber >= orderListAllNameSet.length){
          getNextParticipantRightCameraSeatNumber = 0;
        }
        var NextParticipantName = orderListAllNameSet[getNextParticipantRightCameraSeatNumber];
        console.log('my next participant is ' + NextParticipantName);

        // search from the participant set to get the correct right camera
        for(let i = 0; i<participants.length;i++){
          let participantName = participants[i].displayName.toUpperCase();
          if(participantName.includes(NextParticipantName) && participantName.includes('RIGHT')){
            console.log('find the right camera, should appear only once!');
            myMeetingOrderList.push( participants[i]);
            break;
          }
        }
        var getNextParticipantLeftCameraSeatNumber = getNextParticipantRightCameraSeatNumber + 1;
        if(getNextParticipantLeftCameraSeatNumber >= orderListAllNameSet.length){
          getNextParticipantLeftCameraSeatNumber = 0;
        }
        var NextnextParticipantName = orderListAllNameSet[getNextParticipantLeftCameraSeatNumber];
        console.log('my next next participant is ' + NextnextParticipantName);

        // search from the participant set to get the correct left camera
        for(let i = 0; i<participants.length;i++){
          let participantName = participants[i].displayName.toUpperCase();
          if(participantName.includes(NextnextParticipantName) && participantName.includes('LEFT')){
            console.log('find the left camera, should appear only once!');
            myMeetingOrderList.push( participants[i]);
            break;
          }
        }

        pageParticipants = myMeetingOrderList;
       }
       

       if(currentUserDisplayName.includes('RIGHT')){
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

