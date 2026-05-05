import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  HttpOverrides.global = MyHttpOverrides();
  
  final url = 'https://192.168.100.134/api/auth/login/';
  print('Testing connection to: ' + url);
  
  try {
    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode({
        'username': 'student1',
        'password': 'password123'
      }),
    ).timeout(Duration(seconds: 10));
    
    print('Status Code: ' + response.statusCode.toString());
    print('Headers: ' + response.headers.toString());
    print('Response Body: ' + response.body);
  } catch (e) {
    print('Error occurred: ' + e.toString());
  }
}
