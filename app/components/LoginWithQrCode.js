import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    Alert,
    ActivityIndicator,
    SectionList,
    FlatList,
    TouchableOpacity,
    TouchableHighlight,
    Modal
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { Actions } from 'react-native-router-flux';
import { Query } from 'react-apollo';
import MUIDataTable from "mui-datatables";
import { Button } from './common';
import Loading from './Loading';
import { guardian } from '../../shared/AuthGuard';
import { AppConsumer } from '../App';
import { getCurrentEventsQuery } from '../../shared/queries';
import { currentEventsQuery } from '../../web/admin/queries/events'
import { bandQuery } from '../../shared/queries';
import { musicianQuery } from '../../shared/queries';

import { dark, light, highlight, success } from '../colors';

const TEST_EUGENE_MAB = 'event_2019_eugene-make-a-band_26426992282555_06a96c48c88c4396';
const TEST_BEND_MAB = 'event_2015_bend-make-a-band_264269456487494654_7d5c5f0a28feb98b';

// QR Scan mode
const MODE_SCAN = 'MODE_SCAN';
const MODE_MANUAL = 'MODE_MANUAL';
const MODE_PHOTOS = 'MODE_PHOTOS';


export default class LoginWithQrCode extends Component {
                   state = {
                       scanMode: MODE_SCAN,
                       enteredCode: '',
                       loading: false,
                       eventId: '',
                       modalVisible: false,
                       currentArtistName: '',
                       currentArtistId: '',
                       currentArtistImageUrl: ''
                   };

                   scannedQrCode = changeEventId => e => {
                       this.setState({ loading: true });
                       const eventIdParts = e.data.split('_');
                       let eventId;

                       if (eventIdParts.length === 5) {
                           eventId = `${eventIdParts[0]}_${eventIdParts[1]}_${eventIdParts[2]}`;
                       }

                       guardian
                           .loginBallotQrCode(e.data)
                           .then(() => {
                               changeEventId(eventId, () => {
                                   Actions.main();
                               });
                               this.setState({ loading: false });
                           })
                           .catch(err => {
                               this.setState({ loading: false });
                               Alert.alert('Unable to validate ballot', err.message);
                           });
                   };

                   loginWithCode = changeEventId => () => {
                       this.setState({ loading: true });
                       const { enteredCode, eventId } = this.state;
                       guardian
                           .loginBallotEventIdAndCode(eventId, enteredCode)
                           .then(() => {
                               changeEventId(eventId, () => {
                                   Actions.main();
                               });
                               this.setState({ loading: false });
                           })
                           .catch(err => {
                               this.setState({ loading: false });
                               Alert.alert('Unable to validate code', err.message);
                           });
                   };

                   renderScanner(changeEventId) {
                       return (
                           <QRCodeScanner
                               showMarker
                               onRead={this.scannedQrCode(changeEventId)}
                               topViewStyle={styles.topView}
                               topContent={<Text style={styles.topViewText}>Scan your Fanosity Ballot</Text>}
                               bottomViewStyle={styles.bottomView}
                               bottomContent={
                                   <View>
                                       <Button onPress={() => this.setState({ scanMode: MODE_MANUAL })}>
                                           Manual Entry
                                       </Button>
                                       <Button onPress={() => this.setState({ scanMode: MODE_PHOTOS })}>
                                           Test Photos
                                       </Button>
                                   </View>
                               }
                           />
                       );
                   }

                   renderManualInput(changeEventId) {
                       return (
                           <View style={styles.manualEntryContainer}>
                               <View>
                                   <Query
                                       query={getCurrentEventsQuery}
                                       onCompleted={({ currentEvents }) => {
                                           if (currentEvents.length) {
                                               this.state.eventId = currentEvents[0].eventId;
                                           }
                                       }}
                                   >
                                       {({ loading, error, data }) => {
                                           if (loading) {
                                               return (
                                                   <ActivityIndicator
                                                       size="small"
                                                       color={highlight}
                                                       style={{ paddingBottom: 10 }}
                                                   />
                                               );
                                           }

                                           if (error) {
                                               return;
                                           }

                                           return data.currentEvents.map(({ eventId, name }) => {
                                               let buttonBackground = dark;
                                               if (this.state.eventId === eventId) {
                                                   buttonBackground = success;
                                               }

                                               return (
                                                   <Button
                                                       key={eventId}
                                                       buttonStyleOverwrite={[
                                                           styles.eventName,
                                                           { backgroundColor: buttonBackground }
                                                       ]}
                                                       onPress={() => {
                                                           this.setState({ eventId });
                                                       }}
                                                   >
                                                       {name}
                                                   </Button>
                                               );
                                           });
                                       }}
                                   </Query>
                               </View>
                               <TextInput
                                   style={styles.manualEntryTextInput}
                                   onChangeText={enteredCode => this.setState({ enteredCode })}
                                   value={this.state.enteredCode}
                               />
                               <Button
                                   buttonType={Button.INVERSE}
                                   onPress={this.loginWithCode(changeEventId)}
                                   buttonStyleOverwrite={styles.manualButtonSpacing}
                               >
                                   Sign in with code
                               </Button>
                               <Button
                                   onPress={() => this.setState({ scanMode: MODE_SCAN })}
                                   buttonStyleOverwrite={styles.manualButtonSpacing}
                               >
                                   Back to Scanner
                               </Button>
                           </View>
                       );
                   }

                   renderPhotos() {
                       const queryParams = { eventId: 'event_2019_eugene-make-a-band' };
                       return (
                           <View style={styles.modalContainer}>
                               <Modal
                                   animationType="slide"
                                   transparent={false}
                                   visible={this.state.modalVisible}
                                   onRequestClose={() => {
                                       Alert.alert('Modal has been closed.');
                                   }}
                               >
                                   <View style={styles.modalContainer}>
                                       <Text style={styles.topViewText}>{this.state.currentArtistName}</Text>
                                       <Text style={styles.topViewText}>{this.state.currentArtistId}</Text>
                                       <Text style={styles.topViewText}>{this.state.currentArtistImageUrl}</Text>
                                       
                                       <TouchableHighlight
                                           onPress={() => {
                                               this.setModalVisible(!this.state.modalVisible);
                                           }}
                                       >
                                           <Text style={styles.topViewText}>Back</Text>
                                       </TouchableHighlight>
                                   </View>
                               </Modal>

                               <Text style={styles.topViewText}>All Musicians:</Text>

                               {this.DoMusicianQuery(queryParams)}

                               <Button
                                   onPress={() => this.setState({ scanMode: MODE_SCAN })}
                                   buttonStyleOverwrite={styles.manualButtonSpacing}
                               >
                                   Back to Scanner
                               </Button>
                           </View>
                       );
                   }


                   ///////////////////////////////////////////////////
                   setModalVisible(visible) {
                       this.setState({modalVisible: visible});
                   }

                   setCurrentArtistName(name) {
                       this.setState({currentArtistName: name});
                   }

                   setCurrentArtistId(id) {
                       this.setState({currentArtistId: id});
                   }

                   setCurrentArtistImageUrl(url) {
                       this.setState({currentArtistImageUrl: url});
                   }
                   ///////////////////////////////////////////////////



                   DoMusicianQuery = queryParams => (
                       <Query query={musicianQuery} variables={queryParams}>
                           {({ loading, error, data }) => {
                               if (loading) return null;
                               if (error) return `Error! ${error}`;
                               return (
                                   <FlatList
                                       data={data.musicians}
                                       initialNumToRender={20}
                                       horizontal={false}
                                       numColumns={1}
                                       initialScrollIndex={0}
                                       renderItem={({ item }) => (
                                           <TouchableOpacity
                                               style={{
                                                   maxHeight: 20,
                                                   minHeight: 14,
                                                   marginTop: 10,
                                                   marginHorizontal: 20
                                               }}
                                               onPress={() => {
                                                    this.setModalVisible(true);
                                                    this.setCurrentArtistName(item.name); 
                                                    this.setCurrentArtistId(item.musicianId);  
                                                    this.setCurrentArtistImageUrl(item.primaryImage.url); 
                                               }}
                                           >
                                               <Text style={styles.mediumText}>{item.name}</Text>
                                           </TouchableOpacity>
                                       )}
                                   />
                               );
                           }}
                       </Query>
                   );

                   _onPressButton() {
                       Alert.alert('You tapped the button!');
                   }

                   makeFlatList = () => (
                       <FlatList
                           data={[{ key: 'Devin' }, { key: 'Jason' }, { key: 'Peter' }]}
                           renderItem={({ item }) => <Text style={styles.textBold}>{item.key}</Text>}
                       />
                   );

                   makeSectionList = () => (
                       <SectionList
                           renderItem={({ item, index, section }) => <Text key={index}>{item}</Text>}
                           renderSectionHeader={({ section: { title } }) => (
                               <Text style={{ fontWeight: 'bold' }}>{title}</Text>
                           )}
                           sections={[
                               { title: 'Title1', data: ['item1', 'item2'] },
                               { title: 'Title2', data: ['item3', 'item4'] },
                               { title: 'Title3', data: ['item5', 'item6'] }
                           ]}
                           keyExtractor={(item, index) => item + index}
                       />
                   );

                   getEventArtists = ({ eventId }) => (
                       <Query query={testQuery} variables={{ eventId }}>
                           {({ loading, error, data }) => {
                               if (loading) return <Loading />;
                               if (error) return `Error! ${error}`;

                               return data.artists.map(artist => this.renderMyArtistCard(artist));
                           }}
                       </Query>
                   );

                   renderMyArtistCard(artist) {
                       const { name, musicianId, primaryImage } = artist;

                       return (
                           <div
                               className="artist-card"
                               key={musicianId}
                               onClick={this.linkToPage(`/artists/${musicianId}`)}
                           >
                               <img className="artist-image" src={primaryImage.url} />
                               <div className="artist-name">{name}</div>
                           </div>
                       );
                   }

                   CurrentEventsList = () => (
                       <Query query={getCurrentEventsQuery}>
                           {({ loading, error, data }) => {
                               if (loading) return null;
                               if (error) return `Error! ${error}`;

                               return <Text style={styles.topViewText}>LA LA LA</Text>;
                           }}
                       </Query>
                   );

                   onMusicianSelected() {}

                   render() {
                       const { scanMode = MODE_SCAN, loading } = this.state;

                       if (loading) {
                           return <Loading loadingText="Validation Ballot ..." />;
                       }

                       return (
                           <View style={styles.scanView}>
                               <AppConsumer>
                                   {({ changeEventId }) => {
                                       if (scanMode === MODE_MANUAL) {
                                           return this.renderManualInput(changeEventId);
                                       }
                                       if (scanMode === MODE_PHOTOS) {
                                           return this.renderPhotos();
                                       }

                                       return this.renderScanner(changeEventId);
                                   }}
                               </AppConsumer>
                           </View>
                       );
                   }
               }

const styles = StyleSheet.create({
    scanView: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center'
    },
    topView: {
        flex: 1,
        backgroundColor: dark,
        zIndex: 1000,
        flexDirection: 'column',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        flexWrap: 'wrap'
    },
    topViewText: {
        fontSize: 24,
        padding: 32,
        color: light,
        textAlign: 'center',
        flexWrap: 'wrap',
        zIndex: 1005
    },
    bottomView: {
        flex: 1,
        backgroundColor: dark,
        paddingLeft: 20,
        paddingRight: 20
    },
    textBold: {
        fontWeight: '500'
    },
    container: {
        flex: 1,
        paddingTop: 8
    },
    modalContainer: {
        flex: 1,
        paddingTop: 8,
        backgroundColor: dark
    },
    buttonText: {
        fontSize: 21,
        color: highlight
    },
    smallText: {
        fontSize: 12,
        color: highlight
    },
    mediumText: {
        fontSize: 16,
        color: highlight
    },
    buttonTouchable: {
        padding: 16,
        backgroundColor: dark,
        borderColor: highlight,
        borderWidth: 1,
        borderRadius: 10
    },
    manualEntryTextInput: {
        height: 60,
        backgroundColor: light,
        borderWidth: 1,
        borderColor: highlight,
        borderStyle: 'solid',
        padding: 10,
        marginLeft: 5,
        marginRight: 5,
        marginBottom: 40
    },
    manualEntryContainer: {
        margin: 20
    },
    manualButtonSpacing: {
        marginBottom: 10
    },
    eventName: {
        marginBottom: 10
    }
});
