#!/bin/bash

function get_dir_revision() {
    local pkg_release
    local last_rev
    
    # Generate a release number for the entire branch
    last_rev=$(svn info $1 2>&1 | grep 'Last Changed Rev')
    pkg_release=${last_rev#Last Changed Rev: }
    if [ -z "$pkg_release" ] ; then
	pkg_release=0
    fi
    # Left pad with zeroes to 6 columns
    printf "%06d" ${pkg_release}
}

function get_pkg_release() {
    get_dir_revision .
}

export PKG_VERSION=1.4
export PKG_RELEASE=$(get_pkg_release)
export PKG_NAME=ec2ui
export PKG_ARCH=noarch

echo $PKG_RELEASE

#--------| Source helper routines
#source ${BUILDFRAMEWORKDIR:-../aes-buildframework}/functions/functions.sh

# -------| Initialization
#source ${BUILDFRAMEWORKDIR:-../aes-buildframework}/functions/init.sh

rm -rf build && mkdir build
rsync -avz -C chrome build/.
for f in build/chrome/content/ec2ui/*.xul build/chrome/content/ec2ui/*.js ; do
    sed -e "s/__VERSION__/$PKG_VERSION/g" -i $f
    sed -e "s/__BUILD__/$PKG_RELEASE/g" -i $f
done
pushd build/chrome && ./make.sh && popd
cp * build 
rm -f build/package.sh
sed -e "s/__VERSION__/$PKG_VERSION/g" -i build/*.rdf
sed -e "s/__BUILD__/$PKG_RELEASE/g" -i build/*.rdf
pushd build && zip -9 ../build/ec2ui.xpi * -x *.sh -x project -x ec2ui.rdf -x *~ && zip -r9 ../build/ec2ui.xpi chrome/*.jar && popd
pushd build && zip -9 ec2-firefox-extension.zip ec2ui.xpi README LICENSE && popd
