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
    Modal,
    Image
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
import { bandMusicianQuery } from '../../shared/queries';

import { dark, light, highlight, success } from '../colors';

const TEST_EUGENE_MAB = 'event_2019_eugene-make-a-band_26426992282555_06a96c48c88c4396';
const TEST_BEND_MAB = 'event_2015_bend-make-a-band_264269456487494654_7d5c5f0a28feb98b';

// QR Scan mode
const MODE_SCAN = 'MODE_SCAN';
const MODE_MANUAL = 'MODE_MANUAL';
const MODE_BAND_BROWSER = 'MODE_BAND_BROWSER';


export default class LoginWithQrCode extends Component {
                   state = {
                       scanMode: MODE_SCAN,
                       enteredCode: '',
                       loading: false,
                       eventId: '',
                       bandListVisible: false,
                       musicianPageVisible: false,
                       currentMusicianId: '',
                       currentMusicianName: '',
                       currentMusicianDescription: '',
                       currentMusicianImageUrl: '',
                       currentMusicianBandRoles: [],
                       currentBandId: '',
                       currentBandName: '',
                       currentBandImageUrl: '',
                       currentBandMusicians: []
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
                                       if (scanMode === MODE_BAND_BROWSER) {
                                           return this.renderBandBrowser();
                                       }

                                       return this.renderScanner(changeEventId);
                                   }}
                               </AppConsumer>
                           </View>
                       );
                   }

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
                                       <Button onPress={() => this.setState({ scanMode: MODE_BAND_BROWSER })}>
                                           Band Browser
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

                   renderBandBrowser() {
                       const queryParams = { eventId: 'event_2019_eugene-make-a-band' };
                       return (
                           <View style={styles.container}>
                               <Modal
                                   animationType="slide"
                                   transparent={false}
                                   visible={this.state.bandListVisible}
                                   onRequestClose={() => {
                                       Alert.alert('Modal has been closed.');
                                   }}
                               >
                                   <View style={styles.modalContainer}>
                                       <Text style={styles.topViewText}>{this.state.currentBandName}</Text>
                                       {this.state.currentBandMusicians.length > 0 ? (
                                           <FlatList
                                               data={this.state.currentBandMusicians}
                                               renderItem={({ item }) => (
                                                   <TouchableOpacity
                                                       style={{
                                                           maxHeight: 20,
                                                           minHeight: 14,
                                                           marginTop: 10,
                                                           marginHorizontal: 20
                                                       }}
                                                       onPress={() => {
                                                           //this.setMusicianPageVisible(true);
                                                           this.setCurrentMusicianName(item.name);
                                                           this.setCurrentMusicianId(item.musicianId);
                                                           this.setCurrentMusicianImageUrl(item.primaryImage.url);
                                                           this.setCurrentMusicianBandRoles(item.bandRoles);
                                                           //this.setCurrentMusicianName(item.musicians[0].name);
                                                       }}
                                                   >
                                                       <Text style={styles.mediumText}>{item.name}</Text>
                                                   </TouchableOpacity>
                                               )}
                                           />
                                       ) : (
                                           <Text style={styles.mediumText}>No Musicians In This Band?</Text>
                                       )}

                                       <Image
                                           style={styles.artistImage}
                                           source={{ uri: this.state.currentBandImageUrl }}
                                       />
                                       <TouchableHighlight>
                                           <Button
                                               style={styles.buttonText}
                                               onPress={() => {
                                                   this.setBandListVisible(!this.state.bandListVisible);
                                               }}
                                           >
                                               Back
                                           </Button>
                                       </TouchableHighlight>
                                   </View>
                               </Modal>

                               <Text style={styles.topViewText}>Eugene Make-A-Band 2019:</Text>

                               {this.DoBandMusicianQuery(queryParams)}

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

                   DoBandMusicianQuery = queryParams => (
                       <Query query={bandMusicianQuery} variables={queryParams}>
                           {({ loading, error, data }) => {
                               if (loading) return null;
                               if (error) return `Error! ${error}`;
                               return (
                                   <FlatList
                                       data={data.bands}
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
                                                   this.setBandListVisible(true);
                                                   this.setCurrentBandName(item.name);
                                                   this.setCurrentBandId(item.bandId);
                                                   this.setCurrentBandImageUrl(item.primaryImage.url);
                                                   this.setCurrentBandMusicians(item.musicians);
                                                   //this.setCurrentMusicianName(item.musicians[0].name);
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

                   ///////////////////////////////////////////////////

                   setBandListVisible(visible) {
                       this.setState({ bandListVisible: visible });
                   }

                   setMusicianPageVisible(visible) {
                       this.setState({ musicianPageVisible: visible });
                   }

                   //////////////////////////////

                   setCurrentMusicianId(id) {
                       this.setState({ currentMusicianId: id });
                   }

                   setCurrentMusicianName(name) {
                       this.setState({ currentMusicianName: name });
                   }

                   setCurrentMusicianDescription(desc) {
                       this.setState({ currentMusicianDescription: desc });
                   }

                   setCurrentMusicianImageUrl(url) {
                       this.setState({ currentMusicianImageUrl: url });
                   }

                   setCurrentMusicianBandRoles(roles) {
                       this.setState({ currentMusicianBandRoles: roles });
                   }
                   //////////////////////////////

                   setCurrentBandId(id) {
                       this.setState({ currentBandId: id });
                   }

                   setCurrentBandName(name) {
                       this.setState({ currentBandName: name });
                   }

                   setCurrentBandImageUrl(url) {
                       this.setState({ currentBandImageUrl: url });
                   }

                   setCurrentBandMusicians(artists) {
                       this.setState({ currentBandMusicians: artists }); //(this is an array)
                   }

                   ///////////////////////////////////////////////////
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
        backgroundColor: dark,
        justifyContent: 'center',
        alignItems: 'center'
    },
    artistImage: {
        height: 300,
        width: 300,
        justifyContent: 'center',
        alignItems: 'center'
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
