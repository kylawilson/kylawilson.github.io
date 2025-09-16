function isWebBluetoothEnabled() {
    if (navigator.bluetooth) {
      return true;
    } else {
      //ChromeSamples.setStatus('Web Bluetooth API is not available.\n' +
      //   'Please make sure the "Experimental Web Platform features" flag is enabled.');
      return false;
    }
}

function displayCharacteristics() {
  console.log("DISPLAY CHARACTERISTICS");
  serviceList.forEach(service => {
    const serviceDiv = document.createElement('div');
    serviceDiv.textContent = `Service: ${service.uuid}`;

    service.characteristics.forEach(characteristic => {
        const charDiv = document.createElement('div');
        charDiv.textContent = `Characteristic: ${characteristic.uuid} ${characteristic.getSupportedProperties()}`;
    });
  });
}

function mapCharToFunction(char) {
  console.log('CHAR UUID: ' + char.value);
  switch (char.value) {
    case ('500a9c4e-2a71-4dc6-85fd-79cf6df702e1'):
      char.textContent = 'SSID';
      break;
    case ('500a9c4e-2a71-4dc6-85fd-79cf6df702e2'):
      char.textContent = 'PASSWORD';
      break;
    case ('eeed3a6e-003a-464b-84b3-2e43a5ff7162'):
      char.textContent = 'TX';
      break;
    case ('500a9c4e-2a71-4dc6-85fd-79cf6df702e4'):
      char.textContent = 'REGION';
      break;
    default:
      console.log('UUID not available to be mapped')
  }
}

function selectRegion() {
  switch(regionSelect.value) {
    case ('1'):
      console.log('Selected: US/CANADA');
      //write value to drive region char
      break;
    case ('2'):
      console.log('Selected: JAPAN');  
      //write value to drive region char
      break;
    case ('3'):
      console.log('Selected: REST OF THE WORLD'); 
      //write value to drive region char 
      break;
    default:
      console.log(regionSelect.value);
      console.log('Invalid region choice. No action taken');
      break;
  }
}

function addCharOptions() {
  serviceList.forEach( service => {
    service.characteristics.forEach(characteristic => {
      if (characteristic.write) {
        const char = document.createElement('option');
        char.value = characteristic.uuid;
        char.textContent = characteristic.uuid;
        mapCharToFunction(char);
        
        writeCharacteristicSelect.appendChild(char);
      }
    })
  })
}


function writeToCharacteristic() {
    const message = writeInput.value;
    const selectedCharacteristicUUID = writeCharacteristicSelect.value;

    if (message && selectedCharacteristicUUID) {
        // Find the selected characteristic to write to
        const characteristic = serviceList.flatMap(service => service.characteristics)
            .find(char => char.uuid === selectedCharacteristicUUID);

        if (characteristic && characteristic.write) {
            characteristic.testWrite(message);
        } else {
            console.error('No writable characteristic found.');
        }
    }
}

class Service {

  constructor(service) {
    this.service = service;
    this.uuid = service.uuid;
    this.characteristics = [];
  }

  printServ() {
    console.log("> SERVICE    " + this.uuid)
    this.characteristics.forEach( char => {
      char.printChar()
    })
  }

  //test the properties of the service's characeteristics
  test_chars() {
    this.characteristics.forEach ( char => 
      char.test()
    )
  }

}


class Characteristic {
  constructor(characteristic) {
    this.characteristic = characteristic;
    this.uuid = characteristic.uuid;
    this.read = false;
    this.write = false;
    this.notify = false;
    
    this.decoder = new TextDecoder();
    this.encoder = new TextEncoder();
  }

  getSupportedProperties() {
  let supportedProperties = [];
  console.log(this.characteristic.properties)
  for (const p in this.characteristic.properties) {
    if (this.characteristic.properties[p] === true) {
      this.updateProps(p)
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
  }

  updateProps(p) {
    switch (p) {
      case "read":
        this.read = true;
        break;
      case "write":
        this.write = true;
        break;
      case "notify":
        this.notify = true;
        break;
      default:
        console.log("property not yet supported");
    }
  }

  printChar() {
    console.log(" > UUID      " + this.uuid);
    console.log(" > READ      " + this.read);
    console.log(" > WRITE     " + this.write);
    console.log(" > NOTIFY    " + this.notify);
  }

  test() {
    /*
    if (this.read) {
      this.testRead();
    }
    if (this.write) {
      this.testWrite("TEST");
    }
    if (this.notify) {
      this.testNotify();
    }
      */
    this.testRead();
    this.testWrite("TEST");
    this.testNotify();
  }

  testRead() {
    let val = this.characteristic.readValue()
    .then( val => {
      const decodedVal = this.decoder.decode(val);
      console.log("VALUE:     " + decodedVal);
      return decodedVal;
    })
  }

  testWrite(message) {
    const bytes = this.encoder.encode(message);
    try{ this.characteristic.writeValueWithoutResponse(bytes); 

    } catch {
      this.log("DOMException: GATT operation already in progress.")
      return Promise.resolve()
        .then(() => this.delayPromise(500))
        .then(() => { characteristic.writeValueWithoutResponse(value);});

    }
    console.log("WROTE MESSAGE:     " + message);
  }

  testNotify() {
    this.characteristic.startNotifications();
    this.characteristic.addEventListener('characteristicvaluechanged', (event) => this.handleCharacteristicValueChanged(event));
    console.log("NOTIFICATIONS STARTED");
  }

  handleCharacteristicValueChanged(event) {
    const characteristic = event.target;
    const value = characteristic.value;

    const decodedValue = this.decoder.decode(value);
    console.log("RECEIVED NOTIFICATION: " + decodedValue);
  }


}

function onButtonClick() {
  let filters = [];
  let driveService1 = 'ba42ce36-ddff-c9bd-c34f-1be701f3b600'
  let driveService2 = '0000ab00-0000-1000-8000-00805f9b34fb'
  filters.push({services: [driveService1, driveService2]});
  let options = {};
  options.filters = filters;
  optionalServices = ['eeed3a6e-003a-464b-84b3-2e43a5ff7160', '500a9c4e-2a71-4dc6-85fd-79cf6df702e0']
  options.optionalServices = optionalServices
  

  console.log('Requesting Bluetooth Device...');
  console.log('with ' + JSON.stringify(options));
  navigator.bluetooth.requestDevice(options)
  .then(device => {
    //save device for future access
    connectedDevice = device;
    console.log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    console.log('Getting Services...');
    return server.getPrimaryServices();
  })
  .then(services => {
    console.log('Getting Characteristics...');
    let queue = Promise.resolve();
    let characteristic_list = []
    services.forEach(service => {
      let curr_serv = new Service(service)
      serviceList.push(curr_serv)
      queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
        console.log('> Service: ' + service.uuid);
        characteristics.forEach(characteristic => {
          let curr_char = new Characteristic(characteristic)
          curr_serv.characteristics.push(curr_char)
          //getSupportedProperties is NOT supported in WebBLE 
          console.log('>> Characteristic: ' + characteristic.uuid + ' ' +
              curr_char.getSupportedProperties(characteristic));
        });
      }));
    });
    return queue;
  })
  .then(() => {
    serviceList.forEach(serv => {
      serv.printServ();
      serv.test_chars();
    });
    displayCharacteristics(serviceList);
    addCharOptions();
  })
  .catch(error => {
    console.log('Argh! ' + error);
  });

}

