import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Configuration de styles professionnels adaptés au format administratif A4
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  // Simulation parfaite de la double bordure administrative
  outerBorder: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 3,
    height: '100%',
  },
  innerBorder: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 25,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  // En-tête de la République
  headerContainer: {
    textAlign: 'center',
    marginBottom: 20,
  },
  republiqueText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ministereText: {
    fontSize: 11,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 12,
  },
  localAdministration: {
    textAlign: 'left',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 1.4,
  },
  docNumber: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Titre Principal
  titleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    paddingHorizontal: 30,
  },
  // Corps des informations
  contentSection: {
    flex: 1,
    marginVertical: 15,
    display: 'flex',
    flexDirection: 'column',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 11,
  },
  fieldLabel: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  fieldValue: {
    marginLeft: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#64748b',
    borderStyle: 'dashed',
    paddingBottom: 2,
    flexGrow: 1,
  },
  fieldValueBold: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Section basse (Décision et jours restants)
  lowerSection: {
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    paddingTop: 12,
    marginTop: 15,
    flexDirection: 'row',
  },
  leftColumn: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingRight: 10,
  },
  rightColumn: {
    width: '60%',
    paddingLeft: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  remainingDaysText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 1.4,
  },
  decisionItem: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  boldText: {
    fontWeight: 'bold',
  },
  // Zone des signatures
  signatureSection: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 10,
  },
  signaturePlace: {
    textAlign: 'left',
  },
  signatureDirector: {
    textAlign: 'center',
    marginRight: 20,
  },
  directorTitle: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 4,
  },
  directorHint: {
    fontSize: 8,
    color: '#64748b',
  },
});

export default function LeaveCertificateDocument({ data }) {
  if (!data) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            
            {/* En-tête de la République Officielle */}
            <View style={styles.headerContainer}>
              <Text style={styles.republiqueText}>République Algérienne Démocratique et Populaire</Text>
              <Text style={styles.ministereText}>Ministère de la Santé</Text>
              
              <View style={styles.localAdministration}>
                <Text>Direction de la Santé et de la Population de la Wilaya de Ghardaïa</Text>
                <Text>Établissement Public de Santé de Proximité de Berriane</Text>
                <Text>Sous-Direction de la Gestion des Ressources Humaines</Text>
                <Text style={styles.docNumber}>
                  N° : {data.docNum || '......'} / {data.year || '2026'}
                </Text>
              </View>
            </View>

            {/* Titre Principal */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>TITRE DE CONGÉ</Text>
            </View>

            {/* Liste descriptive des champs */}
            <View style={styles.contentSection}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Nom et Prénom :</Text>
                <Text style={[styles.fieldValue, styles.fieldValueBold]}>{data.name}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Grade / Fonction :</Text>
                <Text style={styles.fieldValue}>{data.position}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Service :</Text>
                <Text style={styles.fieldValue}>{data.department}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Nom et Prénom du remplaçant :</Text>
                <Text style={styles.fieldValue}>{data.substitute || '—'}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Type de congé :</Text>
                <Text style={styles.fieldValue}>{data.typeText}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Durée :</Text>
                <Text style={styles.fieldValue}>{data.durationText} </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Date de départ :</Text>
                <Text style={[styles.fieldValue, styles.fieldValueBold]}>{data.startDate}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Date de retour :</Text>
                <Text style={[styles.fieldValue, styles.fieldValueBold]}>{data.endDate}</Text>
              </View>
            </View>

            {/* Section Décision & Droits Résiduels */}
            <View style={styles.lowerSection}>
              <View style={styles.leftColumn}>
                <Text style={styles.sectionTitle}>Jours restants :</Text>
                <Text style={styles.remainingDaysText}>{data.remaining || '00 jours'}</Text>
              </View>

              <View style={styles.rightColumn}>
                <Text style={styles.sectionTitle}>DÉCISION :</Text>
                <Text style={styles.decisionItem}>
                  • Nombre de jours accordés : <Text style={styles.boldText}>{data.duration} jour(s)</Text>
                </Text>
                <Text style={styles.decisionItem}>
                  • Du : <Text style={styles.boldText}>{data.startDate}</Text>
                </Text>
                <Text style={styles.decisionItem}>
                  • Au : <Text style={styles.boldText}>{data.endDate}</Text>
                </Text>
              </View>
            </View>

            {/* Zone finale des Signatures */}
            <View style={styles.signatureSection}>
              <View style={styles.signaturePlace}>
                <Text>Fait à Berriane, le : ............................</Text>
              </View>
              <View style={styles.signatureDirector}>
                <Text style={styles.directorTitle}>Le Directeur</Text>
                <Text style={styles.directorHint}>(Espace réservé au cachet)</Text>
              </View>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
}