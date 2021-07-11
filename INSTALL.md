# Build and installation

Example build and installation process, e.g. Ubuntu Server 20.04 or Dietpi. Package build tested on DietPi armv6 (armv7l) and armv8 (aarch64).

## General dependencies

Building the package with `dpkg-buildpackage -b` or by `make all` requires the following libraries and tools (with sub-dependencies) being installed:

* collectd-core
* rrdtool
* librrd-dev
* libprotobuf-c-dev
* protobuf-c-compiler
* libncurses5-dev
* libusb-1.0-0-dev
* lighttpd
* build-essential
* binutils
* cmake
* debhelper
* dh-systemd
* pkg-config
* fakeroot
* git

Install build dependencies:

```
sudo apt-get update
sudo apt-get upgrade

sudo apt-get --no-install-suggests --no-install-recommends install collectd-core rrdtool librrd-dev \
libprotobuf-c-dev protobuf-c-compiler libncurses5-dev libusb-1.0-0-dev \
lighttpd build-essential binutils cmake debhelper dh-systemd pkg-config \
fakeroot git
```

## Build and install librtlsdr-dev (optional)

```
git clone -q --branch master https://git.osmocom.org/rtl-sdr/
cd rtl-sdr
mkdir build
cd build
cmake ../ -DINSTALL_UDEV_RULES=ON
make
sudo make install
sudo ldconfig
``` 

## Build and install libbladeRF (optional)

```
git clone -q --branch master --depth 1 --single-branch https://github.com/Nuand/bladeRF.git
cd bladeRF
mkdir build
cd build
cmake ../ -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DINSTALL_UDEV_RULES=ON -DBLADERF_GROUP=bladerf
make
sudo make install
sudo ldconfig
```

## Build and install libiio and libad9361-iio (optional)

```
sudo apt-get --no-install-suggests --no-install-recommends install libxml2-dev bison flex libaio-dev 

git clone -q --branch master --depth 1 --single-branch https://github.com/analogdevicesinc/libiio.git
cd libiio
mkdir build
cd build
cmake ../ -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DHAVE_DNS_SD=OFF
make
sudo make install
sudo ldconfig

git clone -q --branch master --depth 1 --single-branch https://github.com/analogdevicesinc/libad9361-iio.git
cd libad9361-iio
mkdir build
cd build
cmake ../ -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local
make
sudo make install
sudo ldconfig
```

## Build readsb

```
git clone --branch dev --depth 1 --single-branch https://github.com/mictronics/readsb-protobuf.git
cd readsb-protobuf
```

### Package build depending on SDR support

Build package with no additional receiver library dependencies: `dpkg-buildpackage -b -d -uc`.

Build with RTLSDR support: `dpkg-buildpackage -b -uc --build-profiles=rtlsdr`

Build with BladeRF(uBladeRF) support: `dpkg-buildpackage -b -uc --build-profiles=bladerf`

Build with PlutoSDR support: `dpkg-buildpackage -b -uc --build-profiles=plutosdr`

Build full package with all libraries: `dpkg-buildpackage -b -uc --build-profiles=rtlsdr,bladerf,plutosdr`

### Building manually

You can probably just run `make`. By default make builds with no specific library support. See below.
Binaries are built in the source directory; you will need to arrange to install them (and a method for starting them) yourself.

`make BLADERF=yes` will enable bladeRF support and add the dependency on libbladeRF.

`make RTLSDR=yes` will enable rtl-sdr support and add the dependency on librtlsdr.

`make PLUTOSDR=yes` will enable plutosdr support and add the dependency on libad9361 and libiio.

### Configuration

After installation, either by manual building or from package, you need to configure readsb service and web application.

Edit __/etc/default/readsb__ to set the service options, device type, network ports etc.

The web application is configured by editing __/usr/share/readsb/html/script/readsb/defaults.js__ or __src/script/readsb/default.ts__ prior to compilation. Several settings can be modified through web browser. These settings are stored inside browser indexedDB and are individual to users or browser profiles.

## Note about bias tee support

Bias tee support is available for RTL-SDR.com V3 dongles. If you wish to enable bias tee support,
you must ensure that you are building this package with a version of librtlsdr installed that supports this capability.
You can find suitable source packages [here](https://github.com/librtlsdr/librtlsdr). To enable the necessary
support code when building, be sure to include preprocessor define macro HAVE_BIASTEE, e.g.:

`make HAVE_BIASTEE=yes` will enable biastee support for RTLSDR interfaces.
