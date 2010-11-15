# Default configuration file for the lighttpd web server
# Start using ./script/server lighttpd
here="`dirname \"$0\"`"
echo "cd-ing to $here"
cd "$here"
lighttpd -f lightTPD/conf/lighttpd-mac.conf
